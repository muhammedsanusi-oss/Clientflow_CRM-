import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => cookies.has(name) ? { value: cookies.get(name) } : undefined,
  set: (name: string, value: string) => cookies.set(name, value), delete: (name: string) => cookies.delete(name),
}) }));
let db: typeof import("@project/db");
let auth: typeof import("@project/auth");
let domain: typeof import("@project/domain");
let route: typeof import("../../apps/web/app/api/auth/setup-password/route");
const input = { name: "Tailored portal", description: "A tailored business portal", first_name: "Alex", last_name: "Owner", owner_email: "setup-owner@example.test", email: "business@example.test", phone_number: "2125550100", business_type: "OTHER" as const };
const password = "the owner chooses a private password";
const tokenFrom = (path: string | undefined) => new URLSearchParams(path!.split("#")[1]).get("token")!;
const request = (token: string, origin = "http://localhost", confirmation = password) => new Request("http://localhost/api/auth/setup-password", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ token, password, confirmation }),
});
beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("@project/db"); auth = await import("@project/auth"); domain = await import("@project/domain");
  route = await import("../../apps/web/app/api/auth/setup-password/route");
  await db.prisma.user.create({ data: { id: "setup-developer", isDeveloper: true } });
}, 30_000);
afterAll(async () => { await db?.prisma.$disconnect(); });

describe.sequential("developer-created owner setup links", () => {
  it("keeps a pending account private, stores only a digest, and does not consume a link on GET", async () => {
    const receipt = await domain.provisionBusiness("setup-developer", input, "link");
    const token = tokenFrom(receipt.setupPath);
    const owner = await db.prisma.user.findUniqueOrThrow({ where: { email: input.owner_email } });
    expect(owner).toMatchObject({ mustChangePassword: true, passwordHash: null });
    expect(owner.setupTokenHash).toHaveLength(64); expect(owner.setupTokenHash).not.toBe(token);
    expect(receipt.temporaryPassword).toBe("");
    await expect(auth.authenticate(input.owner_email, token)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    const { randomToken, tokenHash } = await import("../../packages/auth/src/password");
    const pendingSession = randomToken();
    await db.prisma.session.create({ data: { userId: owner.id, sessionToken: tokenHash(pendingSession), restricted: true, expires: new Date(Date.now() + 60000) } });
    cookies.set(auth.SESSION_COOKIE, pendingSession);
    expect(await auth.currentUserId()).toBeNull();
    const page = await import("../../apps/web/app/setup-password/page");
    expect(page.default()).toBeTruthy(); expect(page.default()).toBeTruthy();
    expect((await db.prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).setupTokenHash).toBe(owner.setupTokenHash);
    expect((await route.POST(request(token, "https://foreign.test"))).status).toBe(403);
    expect((await route.POST(request(token, "http://localhost", "mismatch"))).status).toBe(400);
    const activated = await route.POST(request(token));
    expect(activated.status).toBe(200); expect(await activated.json()).toEqual({ redirectTo: "/owner" });
    expect(await auth.currentUserId()).toBe(owner.id);
    expect(await domain.listBusinesses(owner.id)).toMatchObject([{ id: receipt.business.id }]);
    expect((await db.prisma.user.findUniqueOrThrow({ where: { id: owner.id } }))).toMatchObject({ mustChangePassword: false, setupTokenHash: null });
    expect(await db.prisma.session.findUnique({ where: { sessionToken: tokenHash(pendingSession) } })).toBeNull();
    expect((await route.POST(request(token))).status).toBe(401);
    await expect(auth.authenticate(input.owner_email, password)).resolves.toMatchObject({ redirectTo: "/owner" });
    await expect(domain.regenerateOwnerPassword("setup-developer", receipt.business.id, "link")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(domain.getProvisionedBusiness(owner.id, receipt.business.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("expires and regenerates pending links, denies outsiders, and consumes concurrent claims once", async () => {
    const receipt = await domain.provisionBusiness("setup-developer", { ...input, owner_email: "pending-link@example.test" }, "link");
    const token = tokenFrom(receipt.setupPath);
    await db.prisma.user.update({ where: { email: receipt.ownerEmail }, data: { temporaryExpiresAt: new Date(0) } });
    expect((await route.POST(request(token))).status).toBe(401);
    await expect(domain.regenerateOwnerPassword("foreign", receipt.business.id, "link")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const regenerated = await domain.regenerateOwnerPassword("setup-developer", receipt.business.id, "link");
    expect((await route.POST(request(token))).status).toBe(401);
    const results = await Promise.all([route.POST(request(tokenFrom(regenerated.setupPath))), route.POST(request(tokenFrom(regenerated.setupPath)))]);
    expect(results.map(result => result.status).sort()).toEqual([200, 401]);
  });
});
