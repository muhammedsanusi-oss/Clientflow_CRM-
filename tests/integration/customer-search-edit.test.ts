import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ userId: "search-user" as string | null }));
vi.mock("../../packages/auth/src/index.ts", () => ({ currentUserId: async () => auth.userId }));
vi.mock("../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../apps/web/node_modules/next/navigation.js", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  notFound: () => { throw new Error("not-found"); },
}));

let domain: typeof import("@project/domain");
let prisma: (typeof import("@project/db"))["prisma"];
let editAction: (typeof import("../../apps/web/app/customers/[customerId]/edit/actions"))["editCustomerAction"];
const businessId = "search-business";
const input = { firstName: "Maria", lastName: "Lopez", email: "maria@example.test", phoneNumber: "555-1234", address: "10 Main St", preferredContactMethod: "EMAIL" as const };

afterEach(() => { auth.userId = "search-user"; });

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function edit(id: string, previous: Parameters<typeof editAction>[0], data: FormData) {
  data.set("customerId", id);
  return editAction(previous, data);
}

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  domain = await import("@project/domain");
  prisma = (await import("@project/db")).prisma;
  editAction = (await import("../../apps/web/app/customers/[customerId]/edit/actions")).editCustomerAction;
  await prisma.business.createMany({ data: [businessId, "search-foreign"].map((id) => ({ id, name: id, business_type: "OTHER", phone_number: "555", email: `${id}@example.test` })) });
  await prisma.user.createMany({ data: ["search-user", "search-inactive"].map((id) => ({ id, username: id })) });
  await prisma.employee.createMany({ data: ["search-user", "search-inactive"].map((id) => ({ id, user_id: id, business_id: businessId, first_name: "Test", last_name: "Staff", email: `${id}@example.test`, phone_number: "555", role: "STAFF", hire_date: new Date("2026-01-01"), is_active: id === "search-user" })) });
  for (const [id, owner, values] of [
    ["search-maria", businessId, input],
    ["search-foreign-customer", "search-foreign", input],
    ["search-aaron", businessId, { ...input, firstName: "Aaron", lastName: "Adams", email: "aaron@example.test", phoneNumber: "555-9999" }],
    ["search-special", businessId, { ...input, firstName: "Literal_%", email: "literal@example.test", phoneNumber: "555-8888" }],
  ] as const) {
    await prisma.customer.create({ data: { id, business_id: owner, first_name: values.firstName, last_name: values.lastName, email: values.email, phone_number: values.phoneNumber, address: values.address, preferred_contact_method: values.preferredContactMethod } });
  }
  await prisma.note.create({ data: { id: "search-note", customer_id: "search-maria", employee_id: "search-user", content: "Keep this note" } });
  await prisma.location.create({ data: { id: "search-location", business_id: businessId, name: "Main", address: "1 St" } });
  await prisma.appointment.create({ data: { id: "search-appointment", customer_id: "search-maria", employee_id: "search-user", location_id: "search-location", appointment_date: new Date("2026-10-27"), start_time: new Date("2026-10-27T10:00:00Z"), end_time: new Date("2026-10-27T10:30:00Z"), notes: "Preserve" } });
}, 30_000);

describe("customer search", () => {
  it.each(["MARIA", "Maria Lopez", "@example.test", "1234"])("matches %s within the active business", async (query) => {
    const rows = await domain.listCustomersForUser("search-user", businessId, query);
    expect(rows.map((row) => row.id)).toContain("search-maria");
    expect(rows.every((row) => row.id !== "search-foreign-customer")).toBe(true);
  });
  it("matches every token on the same customer and returns no matches", async () => {
    expect(await domain.listCustomersForUser("search-user", businessId, "Maria Adams")).toEqual([]);
    expect(await domain.listCustomersForUser("search-user", businessId, "nobody")).toEqual([]);
  });
  it("treats LIKE wildcard characters as literal text", async () => {
    expect((await domain.listCustomersForUser("search-user", businessId, "_%")).map((row) => row.id)).toEqual(["search-special"]);
  });
  it("lists blank search in stable name order", async () => {
    expect((await domain.listCustomersForUser("search-user", businessId, "  ")).map((row) => row.id)).toEqual(["search-aaron", "search-special", "search-maria"]);
  });
  it("rejects invalid queries before database work", async () => {
    const spy = vi.spyOn(prisma.business, "findFirst");
    await expect(domain.listCustomersForUser("search-user", businessId, "x".repeat(101))).rejects.toThrow();
    expect(domain.customerSearchInputSchema.safeParse(["Maria", "Aaron"]).success).toBe(false);
    expect(domain.customerSearchInputSchema.safeParse("x".repeat(100)).success).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("cannot search foreign, unknown, or inactive memberships", async () => {
    expect(await domain.getCustomerCollectionForUser("search-user", "search-foreign", "Maria")).toBeNull();
    expect(await domain.getCustomerCollectionForUser("search-user", "unknown", "Maria")).toBeNull();
    expect(await domain.getCustomerCollectionForUser("search-inactive", businessId, "Maria")).toBeNull();
  });
});

describe("customer editing", () => {
  it("saves unchanged unique contacts despite matching contacts in another business", async () => {
    expect(await domain.updateCustomerForUser("search-user", "search-maria", input)).toBe(true);
  });
  it("updates all editable fields while preserving ownership and relationships", async () => {
    const changed = { ...input, firstName: "Marie", lastName: "Smith", email: "marie@example.test", phoneNumber: "555-5678", address: "20 Updated St", preferredContactMethod: "TEXT" as const };
    expect(await domain.updateCustomerForUser("search-user", "search-maria", changed)).toBe(true);
    expect(await prisma.customer.findUnique({ where: { id: "search-maria" }, include: { notes: true, appointments: true } })).toMatchObject({ business_id: businessId, first_name: "Marie", last_name: "Smith", email: changed.email, phone_number: changed.phoneNumber, address: changed.address, preferred_contact_method: "TEXT", notes: [{ id: "search-note", customer_id: "search-maria" }], appointments: [{ id: "search-appointment", customer_id: "search-maria" }] });
    await domain.updateCustomerForUser("search-user", "search-maria", input);
  });
  it.each([{ email: "aaron@example.test" }, { phoneNumber: "555-9999" }])("rolls back the entire update on contact conflict %j", async (duplicate) => {
    const before = await prisma.customer.findUnique({ where: { id: "search-maria" } });
    await expect(domain.updateCustomerForUser("search-user", "search-maria", { ...input, firstName: "Must not persist", ...duplicate })).rejects.toBeDefined();
    expect(await prisma.customer.findUnique({ where: { id: "search-maria" } })).toEqual(before);
  });
  it("rejects invalid data and ownership changes without writing", async () => {
    for (const invalid of [{ ...input, email: "invalid" }, { ...input, firstName: " " }, { ...input, businessId: "search-foreign" }]) {
      await expect(domain.updateCustomerForUser("search-user", "search-maria", invalid)).rejects.toThrow();
    }
    expect(await prisma.customer.findUnique({ where: { id: "search-maria" } })).toMatchObject({ first_name: "Maria", business_id: businessId });
  });
  it("does not update foreign/unknown customers or customers through inactive membership", async () => {
    for (const id of ["search-foreign-customer", "unknown"]) expect(await domain.updateCustomerForUser("search-user", id, input)).toBe(false);
    expect(await domain.updateCustomerForUser("search-inactive", "search-maria", input)).toBe(false);
    await prisma.employee.update({ where: { id: "search-user" }, data: { is_active: false } });
    expect(await domain.getCustomerWithNotesForUser("search-user", "search-maria")).toBeNull();
    expect(await domain.updateCustomerForUser("search-user", "search-maria", input)).toBe(false);
    await prisma.employee.update({ where: { id: "search-user" }, data: { is_active: true } });
  });
  it("returns field errors with the submitted values and maps conflicts safely", async () => {
    const invalid = { ...input, email: "invalid" };
    expect(await edit("search-maria", {}, form(invalid))).toMatchObject({ values: invalid, fieldErrors: { email: expect.any(Array) }, error: { code: "VALIDATION_ERROR" } });
    const result = await edit("search-maria", {}, form({ ...input, email: "aaron@example.test" }));
    expect(result.error?.code).toBe("CONFLICT");
    expect(result.error?.message).not.toContain("Prisma");
  });
  it("redirects signed-out submissions before writing", async () => {
    auth.userId = null;
    await expect(edit("search-maria", {}, form(input))).rejects.toThrow("redirect:/login");
    auth.userId = "search-user";
  });
  it("returns identical not-found responses for foreign and unknown submissions", async () => {
    for (const id of ["search-foreign-customer", "unknown"]) await expect(edit(id, {}, form(input))).rejects.toThrow("not-found");
  });
  it("revalidates and redirects only after persisting a successful save", async () => {
    const { revalidatePath } = await import("../../apps/web/node_modules/next/cache.js");
    await expect(edit("search-maria", {}, form({ ...input, address: "Saved through action" }))).rejects.toThrow("redirect:/customers/search-maria");
    expect(await prisma.customer.findUnique({ where: { id: "search-maria" } })).toMatchObject({ address: "Saved through action" });
    expect(revalidatePath).toHaveBeenCalledWith("/customers");
    expect(revalidatePath).toHaveBeenCalledWith("/customers/search-maria");
  });
});
