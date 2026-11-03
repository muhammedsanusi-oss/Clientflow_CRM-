// Real Auth.js handlers and Prisma adapter; only Next's request context is mocked.
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";

const context = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: context.cookie, "x-forwarded-proto": "http", host: "localhost:3000" }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let db: typeof import("../../packages/db/src/index");
let authentication: typeof import("../../packages/auth/src/index");
let userId: string;
const token = randomBytes(32).toString("hex");
const cookie = (value: string) => `authjs.session-token=${value}`;
const req = (path: string, value = context.cookie, method = "GET", body?: string) => new NextRequest(`http://localhost:3000/api/auth/${path}`, {
  method, headers: { cookie: value, "content-type": "application/x-www-form-urlencoded" }, body,
});

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  process.env.AUTH_SECRET = randomBytes(32).toString("hex");
  process.env.AUTH_TRUST_HOST = "true";
  db = await import("../../packages/db/src/index");
  authentication = await import("../../packages/auth/src/index");
  const { PrismaAdapter } = await import("../../packages/auth/node_modules/@auth/prisma-adapter");
  const adapter = PrismaAdapter(db.prisma);
  const user = await adapter.createUser!({ id: "ignored", email: "oauth@example.test", emailVerified: null, name: "OAuth user", image: null });
  userId = user.id;
  await adapter.linkAccount!({ userId, type: "oauth", provider: "github", providerAccountId: "github-proof-user" });
  await adapter.createSession!({ userId, sessionToken: token, expires: new Date(Date.now() + 86_400_000) });
}, 30000);
afterAll(async () => { await db?.prisma.$disconnect(); });

describe.sequential("database authentication boundary", () => {
  it("resolves persisted adapter sessions and exposes the database User id", async () => {
    context.cookie = cookie(token);
    expect(await authentication.currentUserId()).toBe(userId);
    const response = await authentication.handlers.GET(req("session"));
    expect((await response.json()).user).toMatchObject({ id: userId, name: "OAuth user" });
    expect((await db.prisma.account.findUnique({ where: { provider_providerAccountId: { provider: "github", providerAccountId: "github-proof-user" } } }))?.userId).toBe(userId);
  });

  it("rejects absent, legacy, one-character edited, and user-id cookies", async () => {
    for (const value of ["", `session=${userId}`, cookie(userId), cookie(token.slice(0, -1) + (token.endsWith("0") ? "1" : "0"))]) {
      context.cookie = value;
      expect(await authentication.currentUserId()).toBeNull();
    }
  });

  it("rejects expired sessions", async () => {
    await db.prisma.session.create({ data: { userId, sessionToken: "expired-proof", expires: new Date(0) } });
    context.cookie = cookie("expired-proof");
    expect(await authentication.currentUserId()).toBeNull();
  });

  it("isolates reads and writes between two persisted authenticated users", async () => {
    // This uses real session lookup, not a mocked currentUserId. GitHub exchange
    // itself still needs the teammate's browser proofs with two actual accounts.
    const second = await db.prisma.user.create({ data: { email: "second@example.test" } });
    const secondToken = randomBytes(32).toString("hex");
    await db.prisma.session.create({ data: { userId: second.id, sessionToken: secondToken, expires: new Date(Date.now() + 86_400_000) } });
    const businesses = await import("../../apps/web/app/api/Business/route");
    const customers = await import("../../apps/web/app/api/Business/[id]/customers/route");
    const item = await import("../../apps/web/app/api/Business/[id]/customers/[customerId]/route");
    const jsonRequest = (body: unknown) => new Request("http://localhost:3000/api/Business", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const input = { name: "Session proof", first_name: "Owner", last_name: "Proof", business_type: "OTHER", email: "owner@example.test", phone_number: "2125550142" };
    const customerInput = { first_name: "Private", last_name: "Customer", phone_number: "2125550199", email: "customer@example.test", address: "123 Main St", preferred_contact_method: "EMAIL" };
    const owned: Array<{ token: string; businessId: string; customerId: string }> = [];
    for (const value of [token, secondToken]) {
      context.cookie = cookie(value);
      const response = await businesses.POST(jsonRequest(input));
      expect(response.status).toBe(201);
      const businessId = (await response.json()).business.business.id;
      const created = await customers.POST(jsonRequest(customerInput), { params: Promise.resolve({ id: businessId }) });
      expect(created.status).toBe(201);
      owned.push({ token: value, businessId, customerId: (await created.json()).customer.id });
    }
    for (const [owner, stranger] of [[owned[0], owned[1]], [owned[1], owned[0]]]) {
      context.cookie = cookie(stranger.token);
      const list = await businesses.GET();
      expect((await list.json()).businesses.map((value: { id: string }) => value.id)).toEqual([stranger.businessId]);
      const response = await item.GET(new Request("http://localhost:3000/api/private"), { params: Promise.resolve({ id: owner.businessId, customerId: owner.customerId }) });
      expect(response.status).toBe(404);
      const write = await customers.POST(jsonRequest({ ...customerInput, email: "intruder@example.test" }), { params: Promise.resolve({ id: owner.businessId }) });
      expect(write.status).toBe(404);
    }
    expect(await db.prisma.customer.count()).toBe(2);
  });

  it("returns 401 on every private API export before parsing the request", async () => {
    context.cookie = "";
    const routes = import.meta.glob("../../apps/web/app/api/**/route.ts");
    let count = 0;
    for (const [path, load] of Object.entries(routes)) {
      if (path.includes("/auth/") || path.includes("/health/")) continue;
      const route = await load() as Record<string, (...args: unknown[]) => Promise<Response>>;
      for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
        if (!route[method]) continue;
        const response = await route[method](new Request("http://localhost:3000/api/private", { method, ...(method === "GET" ? {} : { body: "{" }) }), { params: Promise.resolve({}) });
        expect(response.status, `${method} ${path}`).toBe(401);
        expect((await response.json()).error).toMatchObject({ code: "UNAUTHENTICATED" });
        count++;
      }
    }
    expect(count).toBeGreaterThan(30);
  });

  it("redirects every private page and server action before accessing data", async () => {
    context.cookie = "";
    const pages = import.meta.glob("../../apps/web/app/**/page.tsx");
    for (const [path, load] of Object.entries(pages)) {
      if (path.includes("/login/")) continue;
      const page = await load() as { default: (props: unknown) => Promise<unknown> };
      await expect(page.default({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }), path).rejects.toThrow("REDIRECT:/login");
    }
    const actions = import.meta.glob("../../apps/web/app/**/actions.ts");
    for (const load of Object.values(actions)) {
      const module = await load() as Record<string, (...args: unknown[]) => Promise<unknown>>;
      for (const action of Object.values(module)) {
        if (typeof action === "function") await expect(action({}, new FormData())).rejects.toThrow("REDIRECT:/login");
      }
    }
  });

  it("sign-out deletes the session so the old cookie cannot be replayed", async () => {
    context.cookie = cookie(token);
    const csrfResponse = await authentication.handlers.GET(req("csrf"));
    const { csrfToken } = await csrfResponse.json();
    const csrfCookie = csrfResponse.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const response = await authentication.handlers.POST(req("signout", `${cookie(token)}; ${csrfCookie}`, "POST", new URLSearchParams({ csrfToken, callbackUrl: "http://localhost:3000/login" }).toString()));
    expect(response.status).toBe(302);
    expect(await db.prisma.session.findUnique({ where: { sessionToken: token } })).toBeNull();
    expect(await authentication.currentUserId()).toBeNull();
  });
});
