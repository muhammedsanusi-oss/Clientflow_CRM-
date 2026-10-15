import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ userId: "onboarding-owner" as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: vi.fn(async () => auth.userId) }));
vi.mock("../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../apps/web/node_modules/next/navigation.js", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

const businessInput = { name: "Onboarding Studio", business_type: "SALON" as const, email: "owner@onboarding.test", phone_number: "2125550101", first_name: "Taylor", last_name: "Owner" };
const customerInput = { firstName: "Alex", lastName: "Client", email: "alex@onboarding.test", phoneNumber: "2125550199", address: "10 Main Street", preferredContactMethod: "EMAIL" as const };
function form(values: Record<string, string>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

describe("business creation and customer linking", () => {
  let db: typeof import("../../packages/db/src/index");
  let domain: typeof import("../../packages/domain/src/index");
  let addBusiness: typeof import("../../apps/web/app/businesses/new/actions")["addBusinessAction"];
  let addCustomer: typeof import("../../apps/web/app/customers/actions")["addCustomerAction"];
  let api: typeof import("../../apps/web/app/api/customers/route");
  let firstBusinessId: string;
  let secondBusinessId: string;
  let secondEmployeeId: string;
  let foreignBusinessId: string;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    db = await import("../../packages/db/src/index");
    domain = await import("../../packages/domain/src/index");
    addBusiness = (await import("../../apps/web/app/businesses/new/actions")).addBusinessAction;
    addCustomer = (await import("../../apps/web/app/customers/actions")).addCustomerAction;
    api = await import("../../apps/web/app/api/customers/route");
    await db.prisma.user.createMany({ data: ["onboarding-owner", "onboarding-stranger", "onboarding-empty"].map(id => ({ id, username: id })) });
    const first = await domain.createBusiness("onboarding-owner", businessInput);
    const second = await domain.createBusiness("onboarding-owner", { ...businessInput, name: "Second Studio" });
    const foreign = await domain.createBusiness("onboarding-stranger", { ...businessInput, name: "Foreign Studio" });
    firstBusinessId = first.business.id;
    secondBusinessId = second.business.id;
    secondEmployeeId = second.employee.id;
    foreignBusinessId = foreign.business.id;
    await db.prisma.business.update({ where: { id: firstBusinessId }, data: { created_at: new Date("2025-01-01") } });
    await db.prisma.business.update({ where: { id: secondBusinessId }, data: { created_at: new Date("2025-02-01") } });
  }, 60_000);

  beforeEach(async () => {
    auth.userId = "onboarding-owner";
    await db.prisma.employee.update({ where: { business_id_user_id: { business_id: firstBusinessId, user_id: auth.userId } }, data: { is_active: true } });
  });

  it("creates the business and active owner together through the form action", async () => {
    const values = { ...businessInput, name: "Created from form" };
    await expect(addBusiness({}, form(values))).rejects.toThrow("REDIRECT:/customers?businessId=");
    const business = await db.prisma.business.findFirstOrThrow({ where: { name: values.name }, include: { employees: true } });
    expect(business.employees).toHaveLength(1);
    expect(business.employees[0]).toMatchObject({ user_id: auth.userId, role: "OWNER", is_active: true });
    expect(await domain.listBusinesses(auth.userId!)).toEqual(expect.arrayContaining([expect.objectContaining({ id: business.id })]));
  });

  it("rejects blank business fields and rolls back when the owner cannot be created", async () => {
    const count = await db.prisma.business.count();
    const state = await addBusiness({}, form({ ...businessInput, name: "   " }));
    expect(state.fieldErrors?.name?.length).toBeGreaterThan(0);
    await expect(domain.createBusiness("missing-owner", { ...businessInput, name: "Must roll back" })).rejects.toBeDefined();
    expect(await db.prisma.business.count()).toBe(count);
  });

  it("links the new customer to the chosen second business and preserves the selection", async () => {
    await expect(addCustomer({}, form({ ...customerInput, businessId: secondBusinessId }))).rejects.toThrow(`REDIRECT:/customers?businessId=${secondBusinessId}`);
    const customer = await db.prisma.customer.findFirstOrThrow({ where: { business_id: secondBusinessId, email: customerInput.email } });
    expect(customer.business_id).toBe(secondBusinessId);
    expect(await domain.getCustomerCollectionForUser(auth.userId!, secondBusinessId)).toEqual(expect.arrayContaining([expect.objectContaining({ id: customer.id })]));
    expect(await domain.getCustomerCollectionForUser(auth.userId!, firstBusinessId)).toEqual([]);
  });

  it("requires a business selection and keeps customer values after validation errors", async () => {
    const count = await db.prisma.customer.count();
    const missing = await addCustomer({}, form(customerInput));
    expect(missing.fieldErrors?.businessId?.length).toBeGreaterThan(0);
    const invalid = await addCustomer({}, form({ ...customerInput, businessId: secondBusinessId, email: "invalid" }));
    expect(invalid).toMatchObject({ businessId: secondBusinessId, values: { firstName: customerInput.firstName }, error: { code: "VALIDATION_ERROR" } });
    expect(await db.prisma.customer.count()).toBe(count);
  });

  it("returns the same not-found result for foreign, unknown, and inactive business selections", async () => {
    await db.prisma.employee.update({ where: { business_id_user_id: { business_id: firstBusinessId, user_id: auth.userId! } }, data: { is_active: false } });
    const count = await db.prisma.customer.count();
    for (const businessId of [foreignBusinessId, "unknown-business", firstBusinessId]) {
      await expect(addCustomer({}, form({ ...customerInput, businessId }))).rejects.toThrow("NOT_FOUND");
      const url = `http://localhost/api/customers?businessId=${businessId}`;
      const read = await api.GET(new Request(url));
      const write = await api.POST(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(customerInput) }));
      expect(read.status).toBe(404);
      expect(write.status).toBe(404);
      expect(await read.json()).toEqual(await write.json());
    }
    expect(await db.prisma.customer.count()).toBe(count);
    await db.prisma.employee.update({ where: { business_id_user_id: { business_id: firstBusinessId, user_id: auth.userId! } }, data: { is_active: true } });
  });

  it("selects the newest accessible business by default and has no default for a new account", async () => {
    const businesses = await domain.listBusinesses(auth.userId!);
    expect((await domain.getCustomerBusinessForUser(auth.userId!))?.id).toBe(businesses[0].id);
    expect(await domain.getCustomerBusinessForUser("onboarding-empty")).toBeNull();
  });

  it("honors the authorized business query for API creation and reads", async () => {
    const url = `http://localhost/api/customers?businessId=${firstBusinessId}`;
    const response = await api.POST(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(customerInput) }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(await db.prisma.customer.findUnique({ where: { id: body.data.customer.id } })).toMatchObject({ business_id: firstBusinessId });
    const list = await api.GET(new Request(url));
    expect((await list.json()).data.customers).toEqual([expect.objectContaining({ id: body.data.customer.id })]);
  });

  it("uses the customer's business membership for notes and scheduling", async () => {
    const customer = await domain.createCustomerForUser(auth.userId!, { ...customerInput, email: "scheduled@onboarding.test", phoneNumber: "2125550188" }, secondBusinessId);
    const note = await domain.createCustomerNoteForUser(auth.userId!, { customerId: customer!.id, content: "Customer belongs to second business" });
    expect(note?.employee_id).toBe(secondEmployeeId);
    const location = await db.prisma.location.create({ data: { business_id: secondBusinessId, name: "Main", address: "1 Studio Lane" } });
    const service = await db.prisma.service.create({ data: { business_id: secondBusinessId, name: "Consultation", category: "General", description: "Consultation", duration_minutes: 30, base_price: 25, is_Active: true } });
    const appointment = await domain.createAppointmentForUser(auth.userId!, { customerId: customer!.id, locationId: location.id, serviceId: service.id, date: "2026-10-15", startTime: "10:00", details: "Second business" });
    expect(appointment).toMatchObject({ employee_id: secondEmployeeId, customer_id: customer!.id, location_id: location.id });
  });

  it("redirects signed-out business and customer writes before creating rows", async () => {
    auth.userId = null;
    const businessCount = await db.prisma.business.count();
    const customerCount = await db.prisma.customer.count();
    await expect(addBusiness({}, form(businessInput))).rejects.toThrow("REDIRECT:/login");
    await expect(addCustomer({}, form({ ...customerInput, businessId: secondBusinessId }))).rejects.toThrow("REDIRECT:/login");
    expect(await db.prisma.business.count()).toBe(businessCount);
    expect(await db.prisma.customer.count()).toBe(customerCount);
  });
});
