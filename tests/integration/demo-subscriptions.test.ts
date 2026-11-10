import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const identity = vi.hoisted(() => ({ userId: "subscriber" as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => identity.userId }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");

let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
let route: typeof import("../../apps/web/app/api/subscription/route");
const businessId = "subscription-business";
const ownerId = "subscriber";
const customerInput = { firstName: "New", lastName: "Customer", email: "new@demo.test", phoneNumber: "2125550111", address: "Main Street", preferredContactMethod: "EMAIL" as const };
const action = (scenario: "ENROLL" | "PAY_SUCCESS" | "PAY_FAILURE" | "CANCEL", expectedVersion: number, plan: "STANDARD" | "CRM" | "MANAGED" = "STANDARD") => ({ businessId, scenario, expectedVersion, plan });
function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/subscription", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index");
  domain = await import("../../packages/domain/src/index");
  route = await import("../../apps/web/app/api/subscription/route");
  for (const id of [ownerId, "staff", "outsider", "developer", "ungranted-developer"]) {
    await db.prisma.user.create({ data: { id, name: id, isDeveloper: id.includes("developer") } });
  }
  await db.prisma.business.create({ data: {
    id: businessId, name: "Subscription demo", description: "A preserved demo website", email: "business@demo.test", phone_number: "2125550111", business_type: "OTHER", websiteTemplate: "CONTACT", websitePlan: "PLUS",
    employees: { create: [ownerId, "staff"].map(user_id => ({ user_id, first_name: user_id, last_name: "Test", email: `${user_id}@demo.test`, phone_number: "2125550111", role: user_id === ownerId ? "OWNER" : "STAFF", hire_date: new Date() })) },
    developerAccess: { create: { developerId: "developer" } },
    customers: { create: { id: "saved-customer", first_name: "Saved", last_name: "Customer", email: "saved@demo.test", phone_number: "2125550100", address: "Main Street", preferred_contact_method: "EMAIL" } },
    services: { create: { id: "saved-service", name: "Saved service", category: "General", description: "Service", duration_minutes: 30, base_price: 50, is_Active: true } },
    locations: { create: { id: "saved-location", name: "Main", address: "Main Street" } },
  } });
  const employee = await db.prisma.employee.findFirstOrThrow({ where: { user_id: ownerId } });
  await db.prisma.note.create({ data: { id: "saved-note", customer_id: "saved-customer", employee_id: employee.id, content: "Preserve this note" } });
  await db.prisma.appointment.create({ data: {
    id: "saved-appointment", customer_id: "saved-customer", employee_id: employee.id, location_id: "saved-location", notes: "Preserve appointment",
    appointment_date: new Date("2026-12-01"), start_time: new Date("2026-12-01T10:00:00Z"), end_time: new Date("2026-12-01T10:30:00Z"),
    appointment_services: { create: { service_id: "saved-service", quantity: 1, service_name_at_booking: "Saved service", duration_minutes_at_booking: 30, price_at_booking: 50 } },
  } });
  const editor = await domain.getWebsiteEditor(ownerId, businessId);
  const { PublishWebsite } = await import("../../packages/domain/src/website-editing");
  await domain.publishWebsite(ownerId, businessId, PublishWebsite.strip().parse(editor));
}, 30_000);
afterAll(async () => { vi.useRealTimers(); await db?.prisma.$disconnect(); });

async function crmReads() {
  return Promise.all([
    domain.listCustomers(businessId, ownerId), domain.listServices(businessId, ownerId),
    domain.listAppointments(businessId, ownerId), domain.listNotes("saved-customer", businessId, ownerId),
    domain.listAppointmentsForUserMonth(ownerId, "2026-12"),
  ]);
}
async function expectBlocked() {
  for (const rows of await crmReads()) expect(rows).toEqual([]);
  expect(await domain.getCustomerBusinessForUser(ownerId, businessId)).toBeNull();
  expect(await domain.getCustomerWithNotesForUser(ownerId, "saved-customer")).toBeNull();
  expect(await domain.getAppointmentFormForUser(ownerId, "saved-customer")).toBeNull();
  expect(await domain.getOwnerBookingSettings(ownerId, businessId)).toBeNull();
  expect(await domain.getPublicBookingOptions(businessId)).toBeNull();
  expect(await domain.createCustomerForUser(ownerId, customerInput, businessId)).toBeNull();
  expect(await domain.updateCustomerForUser(ownerId, "saved-customer", customerInput)).toBe(false);
  expect(await domain.createCustomerNoteForUser(ownerId, { customerId: "saved-customer", content: "Blocked" })).toBeNull();
  await expect(domain.createPublicBooking(businessId, {
    firstName: "Guest", lastName: "Customer", email: "guest@demo.test", phone: "2125550122", serviceId: "saved-service", locationId: "saved-location", date: "2027-01-04", startTime: "10:00", staffId: "", website: "",
  })).rejects.toMatchObject({ code: "NOT_FOUND" });
  const { GET } = await import("../../apps/web/app/api/Business/[id]/customers/[customerId]/route");
  const response = await GET(new Request("http://localhost/api"), { params: Promise.resolve({ id: businessId, customerId: "saved-customer" }) });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Resource not found" } });
}

describe.sequential("disposable subscription lifecycle drill", () => {
  it("keeps legacy data and access until explicit enrollment", async () => {
    expect((await domain.getDemoSubscription(ownerId, businessId))?.demoSubscription).toBeNull();
    for (const rows of await crmReads()) expect(rows).toHaveLength(1);
    expect(await domain.getPublicBookingOptions(businessId)).not.toBeNull();
    expect(domain.ownerWorkspaceHref({ id: businessId })).toBe(`/calendar?businessId=${businessId}`);
    expect((await domain.simulateSubscription(ownerId, action("ENROLL", -1))).status).toBe("PENDING");
    await expectBlocked();
    await expect(domain.getWebsiteEditor(ownerId, businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(domain.ownerWorkspaceHref({ id: businessId, demoSubscription: { plan: "STANDARD", status: "PENDING", periodEnd: null } })).toBe(`/subscription?businessId=${businessId}`);
  });
  it("activates Standard editing and rejects direct CRM calls", async () => {
    const result = await route.POST(request(action("PAY_SUCCESS", 0)));
    expect(result.status).toBe(200);
    expect((await result.json()).subscription).toMatchObject({ status: "ACTIVE", plan: "STANDARD", version: 1 });
    const editor = await domain.getWebsiteEditor(ownerId, businessId);
    expect(editor).toMatchObject({ id: businessId, maxImages: 20 });
    expect(domain.ownerWorkspaceHref({ id: businessId, demoSubscription: editor.demoSubscription })).toBe(`/businesses/${businessId}/website`);
    await expectBlocked();
    const { OwnerWorkspace } = await import("../../apps/web/components/owner-workspace");
    const navigation = renderToStaticMarkup(createElement(OwnerWorkspace, { business: editor, children: "" }));
    expect(navigation).toContain("Demo subscription");
    expect(navigation).toContain("Edit Website");
    expect(navigation).not.toContain("Appointments");
    expect(navigation).not.toContain("Customers");
    const page = await import("../../apps/web/app/subscription/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({ businessId }) }));
    expect(html).toContain("Demo: no real charges");
    expect(html).toContain("$39/month USD");
    expect(html).toContain("Simulated event history");
  });
  it("upgrades to CRM and renews from the paid-through date", async () => {
    const upgraded = await domain.simulateSubscription(ownerId, action("PAY_SUCCESS", 1, "CRM"));
    for (const rows of await crmReads()) expect(rows).toHaveLength(1);
    expect(await domain.getPublicBookingOptions(businessId)).not.toBeNull();
    const renewed = await domain.simulateSubscription(ownerId, action("PAY_SUCCESS", 2, "CRM"));
    expect(renewed.periodStart).toEqual(upgraded.periodStart);
    expect(renewed.periodEnd).toEqual(domain.addCalendarMonth(upgraded.periodEnd!));
    const history = (await domain.getDemoSubscription(ownerId, businessId))!.demoSubscriptionEvents;
    expect(history).toHaveLength(4);
    expect(history[0]).toMatchObject({ actor: { id: ownerId }, before: { plan: "CRM", amountCents: 7900 }, after: { plan: "CRM", amountCents: 7900, currency: "USD", simulated: true, status: "ACTIVE" } });
  });
  it("blocks on failure, recovers as Managed, then cancels without losing published or private data", async () => {
    const publicBefore = await domain.getPublicWebsite(businessId);
    await domain.simulateSubscription(ownerId, action("PAY_FAILURE", 3, "CRM"));
    await expectBlocked();
    await expect(domain.getWebsiteEditor(ownerId, businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await domain.getDemoSubscription(ownerId, businessId)).not.toBeNull();
    expect(await domain.getPublicWebsite(businessId)).toEqual(publicBefore);
    await domain.simulateSubscription(ownerId, action("PAY_SUCCESS", 4, "MANAGED"));
    for (const rows of await crmReads()) expect(rows).toHaveLength(1);
    await domain.simulateSubscription(ownerId, action("CANCEL", 5, "MANAGED"));
    await expectBlocked();
    expect(await domain.getPublicWebsite(businessId)).toEqual(publicBefore);
    expect(await db.prisma.customer.count({ where: { business_id: businessId } })).toBe(1);
    expect(await db.prisma.note.findUnique({ where: { id: "saved-note" } })).toMatchObject({ content: "Preserve this note" });
    expect(await db.prisma.appointment.findUnique({ where: { id: "saved-appointment" } })).not.toBeNull();
    expect(await domain.getWebsiteEditor("developer", businessId)).toMatchObject({ id: businessId });
    await expect(domain.getWebsiteEditor("ungranted-developer", businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("recovers and downgrades to Standard while preserving legacy image limits", async () => {
    await domain.simulateSubscription(ownerId, action("PAY_SUCCESS", 6, "STANDARD"));
    expect(await domain.getWebsiteEditor(ownerId, businessId)).toMatchObject({ maxImages: 20, websitePlan: "PLUS" });
    await expectBlocked();
  });
  it("enforces expiry and clamps calendar-month renewals at month end", async () => {
    expect(domain.addCalendarMonth(new Date("2028-01-31T10:15:42Z"))).toEqual(new Date("2028-02-29T10:15:42Z"));
    expect(domain.addCalendarMonth(new Date("2027-01-31T10:15:42Z"))).toEqual(new Date("2027-02-28T10:15:42Z"));
    const stored = await db.prisma.demoSubscription.findUniqueOrThrow({ where: { businessId } });
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(stored.periodEnd!);
      await expectBlocked();
      await expect(domain.getWebsiteEditor(ownerId, businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      const recovered = await domain.simulateSubscription(ownerId, action("PAY_SUCCESS", 7, "CRM"));
      expect(recovered.periodStart).toEqual(stored.periodEnd);
      expect(recovered.periodEnd).toEqual(domain.addCalendarMonth(stored.periodEnd!));
    } finally { vi.useRealTimers(); }
  });
});

describe.sequential("subscription authorization, concurrency, and rollback", () => {
  it("rejects foreign, staff, unknown, inactive, and ungranted developer access", async () => {
    for (const userId of ["staff", "outsider", "ungranted-developer"]) {
      expect(await domain.getDemoSubscription(userId, businessId)).toBeNull();
      await expect(domain.simulateSubscription(userId, action("CANCEL", 8, "CRM"))).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(domain.simulateSubscription(ownerId, { ...action("CANCEL", 8, "CRM"), businessId: "unknown" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.employee.updateMany({ where: { user_id: ownerId }, data: { is_active: false } });
    expect(await domain.getDemoSubscription(ownerId, businessId)).toBeNull();
    await expect(domain.simulateSubscription(ownerId, action("CANCEL", 8, "CRM"))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.employee.updateMany({ where: { user_id: ownerId }, data: { is_active: true } });
    expect(await domain.getDemoSubscription("developer", businessId)).not.toBeNull();
  });
  it("accepts one competing version and returns a safe 409 for stale requests", async () => {
    const results = await Promise.allSettled([
      domain.simulateSubscription(ownerId, action("PAY_SUCCESS", 8, "CRM")),
      domain.simulateSubscription("developer", action("PAY_SUCCESS", 8, "CRM")),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    expect(await db.prisma.demoSubscriptionEvent.count({ where: { businessId } })).toBe(10);
    const response = await route.POST(request(action("PAY_SUCCESS", 8, "CRM")));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
  });
  it("rolls back the transition when event history cannot be written", async () => {
    const before = await db.prisma.demoSubscription.findUnique({ where: { businessId } });
    await db.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_demo_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected history failure'; END $$`);
    await db.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_demo_event BEFORE INSERT ON "DemoSubscriptionEvent" FOR EACH ROW EXECUTE FUNCTION reject_demo_event()`);
    try {
      const response = await route.POST(request(action("CANCEL", 9, "CRM")));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
      expect(await db.prisma.demoSubscription.findUnique({ where: { businessId } })).toEqual(before);
      expect(await db.prisma.demoSubscriptionEvent.count({ where: { businessId } })).toBe(10);
    } finally {
      await db.prisma.$executeRawUnsafe('DROP TRIGGER reject_demo_event ON "DemoSubscriptionEvent"');
      await db.prisma.$executeRawUnsafe('DROP FUNCTION reject_demo_event()');
    }
  });
  it("rejects forged prices, invalid JSON, cross-origin actions, and signed-out access", async () => {
    expect((await route.POST(request({ ...action("CANCEL", 9, "CRM"), amountCents: 1 }))).status).toBe(400);
    expect((await route.POST(new Request("http://localhost/api/subscription", { method: "POST", headers: { origin: "http://localhost" }, body: "{" }))).status).toBe(400);
    expect((await route.POST(request(action("CANCEL", 9, "CRM"), "https://foreign.test"))).status).toBe(403);
    identity.userId = "staff";
    expect((await route.POST(request(action("CANCEL", 9, "CRM")))).status).toBe(404);
    identity.userId = null;
    expect((await route.POST(request(action("CANCEL", 9, "CRM")))).status).toBe(401);
    identity.userId = ownerId;
  });
});
