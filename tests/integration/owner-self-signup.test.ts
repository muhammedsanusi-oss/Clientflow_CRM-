import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => context.values.has(name) ? { value: context.values.get(name) } : undefined,
  set: (name: string, value: string) => context.values.set(name, value),
  delete: (name: string) => context.values.delete(name),
}) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

const originalNodeEnv = process.env.NODE_ENV;
const password = "a local demo owner password";
const signupInput = {
  first_name: "Casey",
  last_name: "Owner",
  owner_email: "casey@signup.test",
  password,
  password_confirmation: password,
  name: "Casey Studio",
  description: "A local demo business",
  business_type: "SALON",
  email: "hello@casey.test",
  phone_number: "2125550199",
  website_template: "SALON",
  website_plan: "PLUS",
  public_address: "10 Public Main Street",
  opening_hours: "Monday-Friday",
  billing_street: "900 Private Billing Way",
  billing_apt_suite: "Suite 10",
  billing_city: "New York",
  billing_state: "NY",
  billing_zip: "10001",
};

function request(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.sequential("local owner self-signup", () => {
  let db: typeof import("../../packages/db/src/index");
  let auth: typeof import("../../packages/auth/src/index");
  let domain: typeof import("../../packages/domain/src/index");
  let signup: typeof import("../../apps/web/app/api/auth/signup/route");
  let ownerId: string;
  let businessId: string;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    db = await import("../../packages/db/src/index");
    auth = await import("../../packages/auth/src/index");
    domain = await import("../../packages/domain/src/index");
    signup = await import("../../apps/web/app/api/auth/signup/route");
    const { hashPassword } = await import("../../packages/auth/src/password");
    const passwordHash = await hashPassword("a developer account password");
    await db.prisma.user.create({ data: {
      email: "developer@signup.test",
      isDeveloper: true,
      passwordHash,
    } });
  }, 30_000);

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    context.values.clear();
  });

  afterAll(async () => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    await db?.prisma.$disconnect();
  });

  it("creates one isolated owner business, stores private billing data, and signs the owner in", async () => {
    const response = await signup.POST(request(signupInput));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.redirectTo).toMatch(/^\/businesses\/.+\/website$/);
    expect(context.values.has(auth.SESSION_COOKIE)).toBe(true);

    ownerId = (await auth.currentUserId())!;
    const user = await db.prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    expect(user.email).toBe(signupInput.owner_email);
    expect(user.name).toBe("Casey Owner");
    expect(user.mustChangePassword).toBe(false);
    expect(user.emailVerified).toBeNull();

    const business = await db.prisma.business.findFirstOrThrow({
      where: { name: signupInput.name },
      include: { billingAddress: true, employees: true },
    });
    businessId = business.id;
    expect(business.websiteTemplate).toBe("SALON");
    expect(business.websitePlan).toBe("PLUS");
    expect(business.billingAddress).toMatchObject({
      street: signupInput.billing_street,
      apartmentSuite: signupInput.billing_apt_suite,
      city: signupInput.billing_city,
      state: signupInput.billing_state,
      zipCode: signupInput.billing_zip,
    });
    expect(business.employees).toHaveLength(1);
    expect(business.employees[0]).toMatchObject({ user_id: ownerId, role: "OWNER", is_active: true });
    expect(await db.prisma.developerBusinessAccess.count({ where: { businessId } })).toBe(1);

    const publicSite = await domain.getPublicWebsite(businessId);
    expect(JSON.stringify(publicSite)).not.toContain("Private Billing");
    expect(publicSite).not.toHaveProperty("billingAddress");
    expect(publicSite).not.toHaveProperty("websitePlan");
    expect(await domain.getWebsiteEditor(ownerId, businessId)).toMatchObject({ id: businessId });
  });

  it("rejects duplicate email signups without changing existing records", async () => {
    const businessesBefore = await db.prisma.business.count();
    const response = await signup.POST(request({ ...signupInput, owner_email: signupInput.owner_email.toUpperCase() }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
    expect(await db.prisma.business.count()).toBe(businessesBefore);
    expect(await db.prisma.user.count({ where: { email: signupInput.owner_email } })).toBe(1);
  });

  it("does not create accounts for invalid signup details", async () => {
    const response = await signup.POST(request({ ...signupInput, billing_street: " " }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION");
    expect(await db.prisma.user.count({ where: { email: signupInput.owner_email } })).toBe(1);
  });

  it("does not allow an owner to open another owner's website editor", async () => {
    const second = await domain.createLocalOwnerSignup({
      ...signupInput,
      first_name: "Jordan",
      owner_email: "jordan@signup.test",
      email: "hello@jordan.test",
      name: "Jordan Studio",
    });
    await expect(domain.getWebsiteEditor(ownerId, second.business.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getWebsiteEditor(ownerId, "unknown-business")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await domain.listOwnerDashboardBusinesses(ownerId)).map(business => business.id)).toEqual([businessId]);
  });

  it("returns not-found and creates no account when signup is outside local development", async () => {
    process.env.NODE_ENV = "production";
    const usersBefore = await db.prisma.user.count();
    const response = await signup.POST(request({ ...signupInput, owner_email: "blocked@signup.test" }));
    expect(response.status).toBe(404);
    expect(await db.prisma.user.count()).toBe(usersBefore);
    await expect(domain.createLocalOwnerSignup({ ...signupInput, owner_email: "blocked@signup.test" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const page = await import("../../apps/web/app/signup/page");
    expect(() => page.default()).toThrow("NOT_FOUND");
  });
});
