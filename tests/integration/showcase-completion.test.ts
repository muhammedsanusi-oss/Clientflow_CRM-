import { beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { BusinessWebsite } from "../../apps/web/components/business-sites/business-website";
import { BookingSetup } from "../../apps/web/components/booking-setup";

const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
const businessId = "showcase-business", ownerId = "showcase-owner";

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index");
  domain = await import("../../packages/domain/src/index");
  await db.prisma.user.createMany({ data: [{ id: ownerId }, { id: "showcase-stranger" }, { id: "showcase-staff" }] });
  await db.prisma.business.create({ data: {
    id: businessId, name: "Showcase salon", business_type: "SALON", email: "salon@example.test", phone_number: "2125550100", websiteTemplate: "SALON",
    employees: { create: [
      { user_id: ownerId, role: "OWNER", first_name: "Demo", last_name: "Owner", email: "owner@example.test", phone_number: "2125550101", hire_date: new Date() },
      { user_id: "showcase-staff", role: "STAFF", first_name: "Demo", last_name: "Staff", email: "staff@example.test", phone_number: "2125550102", hire_date: new Date() },
    ] },
  } });
}, 30_000);

describe("showcase booking setup", () => {
  it("offers actual setup destinations and hides booking until prerequisites are configured", async () => {
    const business = await domain.getOwnerBookingSettings(ownerId, businessId);
    expect(business).not.toBeNull();
    const html = renderToStaticMarkup(BookingSetup({ business: business! }));
    expect(html).toContain("Finish your booking setup");
    expect(html).toContain(`/calendar/locations?businessId=${businessId}`);
    expect(html).not.toContain("Open public booking");
    expect(await domain.isPublicBookingReady(businessId)).toBe(false);
    expect(await domain.isPublicBookingReady("unknown-business")).toBe(false);
  });

  it("creates only validated owner locations and preserves existing locations on rejection", async () => {
    const input = { businessId, name: " Main studio ", address: " 100 Example Street " };
    expect(domain.OwnerLocationInput.safeParse({ ...input, name: "   " }).success).toBe(false);
    expect(domain.OwnerLocationInput.safeParse({ ...input, email: "invalid" }).success).toBe(false);
    for (const user of ["showcase-stranger", "showcase-staff"]) {
      await expect(domain.createOwnerLocation(user, input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(domain.createOwnerLocation(ownerId, { ...input, businessId: "foreign" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.prisma.location.count({ where: { business_id: businessId } })).toBe(0);
    const location = await domain.createOwnerLocation(ownerId, input);
    expect(location).toMatchObject({ business_id: businessId, name: "Main studio", address: "100 Example Street", email: null, phone_number: null });
    try { await domain.createOwnerLocation(ownerId, input); throw new Error("Duplicate was accepted"); }
    catch (error) { expect(domain.apiError(error).code).toBe("CONFLICT"); }
    expect(await db.prisma.location.count({ where: { business_id: businessId } })).toBe(1);
  });

  it("enables the public CTA only for configured CRM access and keeps contact available otherwise", async () => {
    await domain.saveOwnerService(ownerId, { businessId, name: "Haircut", description: "Demo appointment", durationMinutes: 30 });
    await domain.addBusinessHoursInterval(ownerId, { businessId, dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
    expect(await domain.isPublicBookingReady(businessId)).toBe(true);
    const site = await domain.getPublicWebsite(businessId);
    let html = renderToStaticMarkup(BusinessWebsite({ site: { ...site!, bookingAvailable: true } }));
    expect(html).toContain(`/book/${businessId}`);
    await db.prisma.demoSubscription.create({ data: { businessId, plan: "STANDARD", status: "ACTIVE", periodEnd: new Date(Date.now() + 86400000) } });
    expect(await domain.isPublicBookingReady(businessId)).toBe(false);
    html = renderToStaticMarkup(BusinessWebsite({ site: { ...site!, bookingAvailable: false } }));
    expect(html).not.toContain(`/book/${businessId}`);
    expect(html).toContain('href="#contact"');
    await expect(domain.createOwnerLocation(ownerId, { businessId, name: "Second", address: "200 Example Street" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.demoSubscription.update({ where: { businessId }, data: { plan: "CRM", status: "CANCELED" } });
    expect(await domain.isPublicBookingReady(businessId)).toBe(false);
    await db.prisma.demoSubscription.update({ where: { businessId }, data: { status: "ACTIVE" } });
    expect(await domain.isPublicBookingReady(businessId)).toBe(true);
    await db.prisma.employee.updateMany({ where: { business_id: businessId, user_id: ownerId }, data: { is_active: false } });
    await expect(domain.createOwnerLocation(ownerId, { businessId, name: "Third", address: "300 Example Street" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
