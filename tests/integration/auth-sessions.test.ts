import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
const context = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => context.values.has(name) ? { value: context.values.get(name) } : undefined,
  set: (name: string, value: string) => context.values.set(name, value),
  delete: (name: string) => context.values.delete(name),
}) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
let db: typeof import("../../packages/db/src/index");
let authentication: typeof import("../../packages/auth/src/index");
let domain: typeof import("../../packages/domain/src/index");
let login: typeof import("../../apps/web/app/api/auth/login/route");
let activation: typeof import("../../apps/web/app/api/auth/change-password/route");
let developerId: string;
let teammateId: string;
let receipt: Awaited<ReturnType<typeof domain.provisionBusiness>>;
const password = "a long developer password";
const permanent = "the business owners new password";
const request = (body: unknown, path = "login", origin = "http://localhost") => new Request(`http://localhost/api/auth/${path}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const input = { name: "Project business", description: "A neighborhood salon", first_name: "Ada", last_name: "Owner", owner_email: "owner@example.test", email: "business@example.test", phone_number: "2125550142", business_type: "SALON" as const };
const form = (values: Record<string, string>) => { const result = new FormData(); for (const [key,value] of Object.entries(values)) result.set(key,value); return result; };
beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index");
  authentication = await import("../../packages/auth/src/index");
  domain = await import("../../packages/domain/src/index");
  login = await import("../../apps/web/app/api/auth/login/route");
  activation = await import("../../apps/web/app/api/auth/change-password/route");
  const { hashPassword } = await import("../../packages/auth/src/password");
  const passwordHash = await hashPassword(password);
  developerId = (await db.prisma.user.create({ data: { email: "developer@example.test", isDeveloper: true, passwordHash } })).id;
  teammateId = (await db.prisma.user.create({ data: { email: "teammate@example.test", isDeveloper: true, passwordHash } })).id;
}, 30000);
afterAll(async () => { await db?.prisma.$disconnect(); });
describe.sequential("developer provisioning and owner authentication", () => {
  it("rejects old identity cookies and invalid credentials without creating accounts", async () => {
    context.values.set("session", developerId);
    expect(await authentication.currentUserId()).toBeNull();
    const before = await db.prisma.user.count();
    expect((await login.POST(request({ email: "missing@example.test", password }))).status).toBe(401);
    expect((await login.POST(request({ email: "developer@example.test", password: "wrong" }))).status).toBe(401);
    expect(await db.prisma.user.count()).toBe(before);
  });
  it("authenticates a developer with a hashed, persisted session and preserves the dashboard", async () => {
    const response = await login.POST(request({ email: " Developer@Example.test ", password }));
    expect(response.status).toBe(200); expect((await response.json()).redirectTo).toBe("/");
    expect(await authentication.currentUserId()).toBe(developerId);
    const token = context.values.get(authentication.SESSION_COOKIE)!;
    expect(await db.prisma.session.findUnique({ where: { sessionToken: token } })).toBeNull();
    const page = await import("../../apps/web/app/page");
    expect(await page.default()).toBeTruthy();
  });
  it("provisions through the existing business form, gives both developers access, and keeps the owner separate", async () => {
    const action = (await import("../../apps/web/app/businesses/new/actions")).addBusinessAction;
    const state = await action({}, form(input));
    expect(state.error).toBeUndefined(); expect(state.receipt?.temporaryPassword).toBeTruthy();
    receipt = { business: await db.prisma.business.findUniqueOrThrow({ where: { id: state.receipt!.businessId } }), temporaryPassword: state.receipt!.temporaryPassword, ownerEmail: state.receipt!.ownerEmail, expiresAt: state.receipt!.expiresAt };
    expect(await db.prisma.developerBusinessAccess.count({ where: { businessId: receipt.business.id } })).toBe(2);
    const members = await db.prisma.employee.findMany({ where: { business_id: receipt.business.id } });
    expect(members).toHaveLength(1); expect(members[0].user_id).not.toBe(developerId); expect(members[0].role).toBe("OWNER");
    expect((await domain.listProvisionedBusinesses(teammateId))[0].id).toBe(receipt.business.id);
    const stored = await db.prisma.user.findUniqueOrThrow({ where: { email: input.owner_email } });
    expect(stored.passwordHash).not.toContain(receipt.temporaryPassword); expect(stored.passwordHash).toMatch(/^scrypt\$/);
  });
  it("rejects duplicate and legacy emails without changing accounts or leaving businesses", async () => {
    const before = await db.prisma.business.count();
    await expect(domain.provisionBusiness(developerId,input)).rejects.toMatchObject({ code: "CONFLICT" });
    await db.prisma.user.create({ data: { username: "legacy@example.test" } });
    await expect(domain.provisionBusiness(developerId,{ ...input, owner_email: "legacy@example.test" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.prisma.business.count()).toBe(before);
    await expect(domain.provisionBusiness("missing",{ ...input, owner_email: "unused@example.test" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rolls back business, owner and membership if access-grant creation fails", async () => {
    // A database trigger fails the final step after the earlier writes have run.
    await db.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_test_grant() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'test grant failure'; END; $$ LANGUAGE plpgsql`);
    await db.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_test_grant BEFORE INSERT ON "DeveloperBusinessAccess" FOR EACH ROW EXECUTE FUNCTION reject_test_grant()`);
    const before = await db.prisma.business.count();
    try {
      await expect(domain.provisionBusiness(developerId,{ ...input, owner_email: "rollback@example.test" })).rejects.toBeDefined();
      expect(await db.prisma.business.count()).toBe(before);
      expect(await db.prisma.user.findUnique({ where: { email: "rollback@example.test" } })).toBeNull();
    } finally {
      await db.prisma.$executeRawUnsafe(`DROP TRIGGER reject_test_grant ON "DeveloperBusinessAccess"`);
      await db.prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_grant()`);
    }
  });
  it("allows only one concurrent use of a temporary credential", async () => {
    const pending = await domain.provisionBusiness(developerId,{ ...input, owner_email: "concurrent@example.test" });
    const results = await Promise.allSettled([
      authentication.authenticate(pending.ownerEmail,pending.temporaryPassword),
      authentication.authenticate(pending.ownerEmail,pending.temporaryPassword),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  });
  it("consumes the temporary password once and denies all private APIs and pages until replacement", async () => {
    context.values.clear();
    const response = await login.POST(request({ email: input.owner_email, password: receipt.temporaryPassword }));
    expect(response.status).toBe(200); expect((await response.json()).redirectTo).toBe("/change-password");
    expect((await authentication.currentSession())?.restricted).toBe(true);
    expect(await authentication.currentUserId()).toBeNull();
    expect((await login.POST(request({ email: input.owner_email, password: receipt.temporaryPassword }))).status).toBe(401);
    const routes = import.meta.glob("../../apps/web/app/api/**/route.ts");
    for (const [path,load] of Object.entries(routes)) {
      if (path.includes("/auth/") || path.includes("/health/") || path.includes("/api/sites/")) continue;
      const route = await load() as Record<string, (...args: unknown[]) => Promise<Response>>;
      for (const method of ["GET","POST","PUT","PATCH","DELETE"]) if (route[method]) {
        expect((await route[method](new Request("http://localhost/api/private",{ method, ...(method === "GET" ? {} : { body: "{" }) }),{ params: Promise.resolve({}) })).status,path).toBe(401);
      }
    }
    const home = await import("../../apps/web/app/page");
    await expect(home.default()).rejects.toThrow("REDIRECT:/login");
    const action = (await import("../../apps/web/app/businesses/new/actions")).addBusinessAction;
    await expect(action({},form(input))).rejects.toThrow("REDIRECT:/login");
  });
  it("validates replacement, rotates the restricted session and grants only the owner's workspace", async () => {
    const oldToken = context.values.get(authentication.SESSION_COOKIE)!;
    expect((await activation.POST(request({ password: permanent, confirmation: "mismatch" },"change-password"))).status).toBe(400);
    expect((await activation.POST(request({ password: receipt.temporaryPassword, confirmation: receipt.temporaryPassword },"change-password"))).status).toBe(400);
    expect((await activation.POST(request({ password: permanent, confirmation: permanent },"change-password"))).status).toBe(200);
    expect(context.values.get(authentication.SESSION_COOKIE)).not.toBe(oldToken);
    const ownerId = await authentication.currentUserId(); expect(ownerId).toBeTruthy();
    expect((await domain.listBusinesses(ownerId!)).map(b=>b.id)).toEqual([receipt.business.id]);
    await expect(domain.getProvisionedBusiness(ownerId!,receipt.business.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.regenerateOwnerPassword(developerId,receipt.business.id)).rejects.toMatchObject({ code: "CONFLICT" });
    context.values.set(authentication.SESSION_COOKIE,oldToken); expect(await authentication.currentSession()).toBeNull();
    expect((await login.POST(request({ email: input.owner_email, password: receipt.temporaryPassword }))).status).toBe(401);
    expect((await login.POST(request({ email: input.owner_email, password: permanent }))).status).toBe(200);
    const businessRoute = await import("../../apps/web/app/api/Business/route");
    expect((await businessRoute.POST(request(input))).status).toBe(404);
  });
  it("rejects expired credentials, regenerates pending credentials, and revokes unfinished activation", async () => {
    const pending = await domain.provisionBusiness(developerId,{ ...input, owner_email: "pending@example.test" });
    await db.prisma.user.update({ where: { email: pending.ownerEmail },data: { temporaryExpiresAt: new Date(0) } });
    expect((await login.POST(request({ email: pending.ownerEmail, password: pending.temporaryPassword }))).status).toBe(401);
    const regenerated = await domain.regenerateOwnerPassword(developerId,pending.business.id);
    expect((await login.POST(request({ email: pending.ownerEmail, password: regenerated.temporaryPassword }))).status).toBe(200);
    const restrictedToken = context.values.get(authentication.SESSION_COOKIE)!;
    await domain.regenerateOwnerPassword(teammateId,pending.business.id);
    context.values.set(authentication.SESSION_COOKIE,restrictedToken); expect(await authentication.currentSession()).toBeNull();
    expect((await activation.POST(request({ password: permanent, confirmation: permanent },"change-password"))).status).toBe(401);
  });
  it("revokes a regular session on logout and rejects cross-origin mutations", async () => {
    await login.POST(request({ email: "developer@example.test", password }));
    const token = context.values.get(authentication.SESSION_COOKIE)!;
    const logout = await import("../../apps/web/app/api/auth/logout/route");
    expect((await logout.POST(request({},"logout","https://foreign.example"))).status).toBe(403);
    expect((await login.POST(request({ email: "developer@example.test", password },"login","https://foreign.example"))).status).toBe(403);
    expect((await logout.POST(request({},"logout"))).status).toBe(200);
    context.values.set(authentication.SESSION_COOKIE,token); expect(await authentication.currentUserId()).toBeNull();
  });
  it("enforces persisted login attempt limits including unknown emails", async () => {
    for(let i=0;i<10;i++) expect((await login.POST(request({ email: "limited@example.test", password: "wrong" }))).status).toBe(401);
    expect((await login.POST(request({ email: "limited@example.test", password: "wrong" }))).status).toBe(429);
    await db.prisma.authThrottle.updateMany({data:{windowStart:new Date(0)}});
    expect((await login.POST(request({ email: "limited@example.test", password: "wrong" }))).status).toBe(401);
  },15000);
  it("provides local developer and owner test accounts without command-line setup", async () => {
    vi.stubEnv("NODE_ENV", "development");
    context.values.clear();
    try {
      const { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } = await import("../../packages/auth/src/test-accounts");
      const response = await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD, accountType: "developer" }));
      expect(response.status).toBe(200); expect((await response.json()).redirectTo).toBe("/");
      expect(await authentication.currentUserId()).toBe(LOCAL_TEST_ACCOUNTS.developer.id);
      const before = await db.prisma.user.count();
      await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD, accountType: "developer" }));
      expect(await db.prisma.user.count()).toBe(before);
      context.values.clear();
      const owner = await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.owner.email, password: LOCAL_TEST_PASSWORD, accountType: "owner" }));
      expect(owner.status).toBe(200); expect((await owner.json()).redirectTo).toBe("/customers");
      const ownerId = await authentication.currentUserId();
      expect(ownerId).toBe(LOCAL_TEST_ACCOUNTS.owner.id);
      expect((await domain.listBusinesses(ownerId!)).map(business => business.id)).toEqual(["local-test-business"]);
    } finally { vi.unstubAllEnvs(); context.values.clear(); }
  });
  it("checks the chosen login type against the stored role without granting privileges", async () => {
    vi.stubEnv("NODE_ENV", "development");
    context.values.clear();
    try {
      const { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } = await import("../../packages/auth/src/test-accounts");
      const response = await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.owner.email, password: LOCAL_TEST_PASSWORD, accountType: "developer" }));
      expect(response.status).toBe(401); expect(await authentication.currentUserId()).toBeNull();
      const owner = await db.prisma.user.findUniqueOrThrow({ where: { id: LOCAL_TEST_ACCOUNTS.owner.id } });
      expect(owner.isDeveloper).toBe(false);
      expect((await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD, accountType: "owner" }))).status).toBe(401);
    } finally { vi.unstubAllEnvs(); context.values.clear(); }
  });
  it("rejects test credentials and existing test sessions outside development", async () => {
    const { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } = await import("../../packages/auth/src/test-accounts");
    vi.stubEnv("NODE_ENV", "development");
    try {
      await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD, accountType: "developer" }));
      expect(await authentication.currentUserId()).toBe(LOCAL_TEST_ACCOUNTS.developer.id);
      vi.stubEnv("NODE_ENV", "production");
      expect(await authentication.currentUserId()).toBeNull();
      expect((await login.POST(request({ email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD, accountType: "developer" }))).status).toBe(401);
    } finally { vi.unstubAllEnvs(); context.values.clear(); }
  });
  it("returns 401 on every private API export before parsing the request", async () => {
    context.values.clear();
    const routes = import.meta.glob("../../apps/web/app/api/**/route.ts");
    let count = 0;
    for (const [path, load] of Object.entries(routes)) {
      if (path.includes("/auth/") || path.includes("/health/") || path.includes("/api/sites/")) continue;
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
    context.values.clear();
    const pages = import.meta.glob("../../apps/web/app/**/page.tsx");
    for (const [path, load] of Object.entries(pages)) {
      if (path.includes("/login/") || path.includes("/app/sites/")) continue;
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

});
