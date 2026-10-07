import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("../../packages/auth/src/current-user", () => ({
  currentUserId: async () => session.userId,
  startSession: async (value: string) => { session.userId = value; },
  endSession: async () => { session.userId = null; },
  SESSION_COOKIE: "session",
}));

let db: typeof import("../../packages/db/src/index");
let businesses: typeof import("../../apps/web/app/api/Business/route");
let locations: typeof import("../../apps/web/app/api/Business/[id]/locations/route");
let employees: typeof import("../../apps/web/app/api/Business/[id]/employees/route");
let login: typeof import("../../apps/web/app/api/auth/login/route");
let ownerId: string;
let outsiderId: string;
let businessId: string;
let staffId: string;
const request = (body: unknown) => new Request("http://localhost/api", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const context = (id = businessId) => ({ params: Promise.resolve({ id }) });
const employeeInput = { firstName: "Grace", lastName: "Hopper", email: "grace@example.com", phone_number: "1234567890", role: "STAFF" };
const locationInput = { name: "Downtown", phone_number: "1234567890", email: "studio@example.com", address: "123 Main St" };
const businessInput = { name: "Acme", first_name: "Ada", last_name: "Owner", email: "ada@example.com", phone_number: "1234567890", business_type: "SPA" };

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index");
  businesses = await import("../../apps/web/app/api/Business/route");
  locations = await import("../../apps/web/app/api/Business/[id]/locations/route");
  employees = await import("../../apps/web/app/api/Business/[id]/employees/route");
  login = await import("../../apps/web/app/api/auth/login/route");
  ownerId = (await db.prisma.user.create({ data: { username: "owner" } })).id;
  outsiderId = (await db.prisma.user.create({ data: { username: "outsider" } })).id;
}, 30000);
afterAll(async () => { await db?.prisma.$disconnect(); });

describe.sequential("business management HTTP handlers against migrated PGlite", () => {
  it("returns 401 without a session on every business handler", async () => {
    session.userId = null;
    const responses = await Promise.all([
      businesses.GET(), businesses.POST(request(businessInput)),
      locations.GET(request({}), context("foreign")), locations.POST(request(locationInput), context("foreign")),
      employees.POST(request(employeeInput), context("foreign")),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } });
    }
  });

  it("creates a business and active owner transactionally; one user can own multiple businesses", async () => {
    session.userId = ownerId;
    const response = await businesses.POST(request(businessInput));
    expect(response.status).toBe(201);
    const { business: result } = await response.json();
    businessId = result.business.id;
    expect(result.employee).toMatchObject({ user_id: ownerId, role: "OWNER", is_active: true });
    const second = await businesses.POST(request({ ...businessInput, name: "Second business" }));
    expect(second.status).toBe(201);
    expect((await (await businesses.GET()).json()).businesses).toHaveLength(2);
    session.userId = outsiderId;
    expect((await (await businesses.GET()).json()).businesses).toEqual([]);
  });

  it("rejects foreign and missing businesses for reads and writes without leaking existence", async () => {
    session.userId = outsiderId;
    for (const id of [businessId, "missing-business"]) {
      for (const response of [await locations.GET(request({}), context(id)),
        await locations.POST(request(locationInput), context(id)), await employees.POST(request(employeeInput), context(id))]) {
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Business not found" } });
      }
    }
    expect(await db.prisma.location.count({ where: { business_id: businessId } })).toBe(0);
    expect(await db.prisma.user.findUnique({ where: { username: employeeInput.email } })).toBeNull();
  });

  it("creates and lists locations and maps duplicate details to 409", async () => {
    session.userId = ownerId;
    expect((await locations.POST(request(locationInput), context())).status).toBe(201);
    expect((await (await locations.GET(request({}), context())).json()).locations).toHaveLength(1);
    const duplicate = await locations.POST(request(locationInput), context());
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.code).toBe("CONFLICT");
  });

  it("creates the employee's own account, supports email sign-in and rejects duplicate membership", async () => {
    session.userId = ownerId;
    const response = await employees.POST(request({ ...employeeInput, email: " Grace@Example.com " }), context());
    expect(response.status).toBe(201);
    const { employee } = await response.json();
    staffId = employee.user_id;
    expect(staffId).not.toBe(ownerId);
    expect(employee).toMatchObject({ email: "grace@example.com", role: "STAFF", is_active: true });
    expect((await employees.POST(request(employeeInput), context())).status).toBe(409);
    const signIn = await login.POST(request({ username: " Grace@Example.com " }));
    expect(signIn.status).toBe(200);
    expect((await signIn.json()).user.id).toBe(staffId);
    expect(session.userId).toBe(staffId);
  });

  it("reuses an employee account across businesses and rolls back orphan accounts on duplicate email", async () => {
    session.userId = ownerId;
    const second = (await (await businesses.GET()).json()).businesses.find((business: { id: string }) => business.id !== businessId);
    const reused = await employees.POST(request(employeeInput), context(second.id));
    expect(reused.status).toBe(201);
    expect((await reused.json()).employee.user_id).toBe(staffId);
    await db.prisma.employee.updateMany({ where: { business_id: businessId, user_id: staffId }, data: { email: "duplicate@example.com" } });
    const duplicate = await employees.POST(request({ ...employeeInput, email: "duplicate@example.com" }), context());
    expect(duplicate.status).toBe(409);
    expect(await db.prisma.user.findUnique({ where: { username: "duplicate@example.com" } })).toBeNull();
    await db.prisma.employee.updateMany({ where: { business_id: businessId, user_id: staffId }, data: { email: employeeInput.email } });
  });

  it("allows managers and rejects staff employee creation; inactive memberships lose access", async () => {
    session.userId = staffId;
    const forbidden = await employees.POST(request({ ...employeeInput, email: "new@example.com" }), context());
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe("FORBIDDEN");
    await db.prisma.employee.updateMany({ where: { user_id: staffId, business_id: businessId }, data: { role: "MANAGER" } });
    expect((await employees.POST(request({ ...employeeInput, email: "new@example.com" }), context())).status).toBe(201);
    await db.prisma.employee.updateMany({ where: { user_id: staffId }, data: { is_active: false } });
    expect((await locations.GET(request({}), context())).status).toBe(404);
    expect((await employees.POST(request({ ...employeeInput, email: "other@example.com" }), context())).status).toBe(404);
    expect((await (await businesses.GET()).json()).businesses).toEqual([]);
  });

  it("returns stable 400 errors for malformed JSON and validation failures", async () => {
    session.userId = ownerId;
    for (const call of [(req: Request) => businesses.POST(req),
      (req: Request) => locations.POST(req, context()), (req: Request) => employees.POST(req, context())]) {
      const invalid = await call(request({}));
      expect(invalid.status).toBe(400);
      expect((await invalid.json()).error.code).toBe("VALIDATION");
      const malformed = await call(new Request("http://localhost/api", { method: "POST", body: "{" }));
      expect(malformed.status).toBe(400);
      expect((await malformed.json()).error.code).toBe("BAD_JSON");
    }
  });

  it("rolls back business creation if the owner account is unknown", async () => {
    const count = await db.prisma.business.count();
    session.userId = "nonexistent-user";
    expect((await businesses.POST(request(businessInput))).status).toBe(404);
    expect(await db.prisma.business.count()).toBe(count);
  });

  it("hides unexpected database errors behind a generic 500", async () => {
    session.userId = ownerId;
    const spy = vi.spyOn(db.prisma.business, "findMany").mockRejectedValueOnce(new Error("Secret connection string"));
    try {
      const response = await businesses.GET();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
    } finally { spy.mockRestore(); }
  });
});
