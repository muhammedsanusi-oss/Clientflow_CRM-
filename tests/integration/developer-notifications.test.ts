import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@project/auth", () => ({ currentUserId: async () => session.userId }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => session.userId }));

let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
let customRequestRoute: typeof import("../../apps/web/app/api/custom-crm-requests/route");
let monitorRoute: typeof import("../../apps/web/app/api/monitoring/webhook/route");
let readRoute: typeof import("../../apps/web/app/api/notifications/read/route");
const ids = {
  developer: "notifications-developer",
  teammate: "notifications-teammate",
  unassignedDeveloper: "notifications-unassigned",
  activatingDeveloper: "notifications-activating",
  owner: "notifications-owner",
  nonDeveloper: "notifications-nondeveloper",
  business: "notifications-business",
};
const monitorSecret = "test-only-monitor-secret-with-at-least-32-characters";

function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe.sequential("developer notifications and custom CRM requests", () => {
  const originalSecret = process.env.UPTIME_WEBHOOK_SECRET;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    process.env.UPTIME_WEBHOOK_SECRET = monitorSecret;
    db = await import("../../packages/db/src/index");
    domain = await import("../../packages/domain/src/index");
    customRequestRoute = await import("../../apps/web/app/api/custom-crm-requests/route");
    monitorRoute = await import("../../apps/web/app/api/monitoring/webhook/route");
    readRoute = await import("../../apps/web/app/api/notifications/read/route");

    await db.prisma.user.createMany({ data: [
      { id: ids.developer, email: `${ids.developer}@example.test`, isDeveloper: true },
      { id: ids.teammate, email: `${ids.teammate}@example.test`, isDeveloper: true },
      { id: ids.unassignedDeveloper, email: `${ids.unassignedDeveloper}@example.test`, isDeveloper: true },
      { id: ids.activatingDeveloper, email: `${ids.activatingDeveloper}@example.test`, isDeveloper: true, mustChangePassword: true },
      { id: ids.owner, email: `${ids.owner}@example.test` },
      { id: ids.nonDeveloper, email: `${ids.nonDeveloper}@example.test` },
    ] });
    await db.prisma.business.create({ data: {
      id: ids.business,
      name: "Notifications Salon",
      business_type: "SALON",
      websiteTemplate: "SALON",
      websitePlan: "PLUS",
      email: "hello@notifications.test",
      phone_number: "2125550100",
      employees: { create: {
        user_id: ids.owner,
        first_name: "Taylor",
        last_name: "Owner",
        email: `${ids.owner}@example.test`,
        phone_number: "2125550100",
        role: "OWNER",
        hire_date: new Date("2025-01-01"),
      } },
      developerAccess: { createMany: { data: [ids.developer, ids.teammate].map(developerId => ({ developerId })) } },
    } });
  }, 30000);

  beforeEach(() => { session.userId = ""; });
  afterAll(async () => {
    if (originalSecret === undefined) delete process.env.UPTIME_WEBHOOK_SECRET;
    else process.env.UPTIME_WEBHOOK_SECRET = originalSecret;
    await db?.prisma.$disconnect();
  });

  it("notifies developers of public inquiries while withholding foreign business details", async () => {
    const contact = domain.WebsiteContact.parse({
      name: "Morgan Visitor",
      email: "morgan@example.test",
      phone: "2125550199",
      message: "I would like to know more about your salon.",
      website: "",
    });
    await domain.submitWebsiteInquiry(ids.business, contact);

    const grantedNotifications = await domain.listDeveloperNotifications(ids.developer);
    const teammateNotifications = await domain.listDeveloperNotifications(ids.teammate);
    const unassignedNotifications = await domain.listDeveloperNotifications(ids.unassignedDeveloper);
    expect(grantedNotifications[0]).toMatchObject({
      type: "WEBSITE_INQUIRY",
      title: "New website inquiry",
      businessId: ids.business,
      href: `/businesses/${ids.business}/requests`,
    });
    expect(teammateNotifications).toHaveLength(1);
    expect(unassignedNotifications[0]).toMatchObject({
      title: "New business request",
      message: "A new business request was submitted.",
      businessId: null,
      href: "/notifications",
    });
    expect(unassignedNotifications[0].message).not.toContain("Notifications Salon");
    expect(await db.prisma.developerNotification.count({ where: { developerId: ids.activatingDeveloper } })).toBe(0);

    const requests = await domain.listDeveloperBusinessRequests(ids.developer, ids.business);
    expect(requests.inquiries).toMatchObject([{ name: "Morgan Visitor", email: "morgan@example.test" }]);
    await expect(domain.listDeveloperBusinessRequests(ids.unassignedDeveloper, ids.business)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("notifies developers when an owner submits an allowed website change request", async () => {
    const schema = domain.WebsiteFeatureRequest.parse({
      title: "Add online consultation booking",
      description: "Let visitors reserve a short consultation before selecting a salon service.",
    });
    await domain.submitWebsiteFeatureRequest(ids.owner, ids.business, schema);
    expect((await domain.listDeveloperNotifications(ids.developer))[0]).toMatchObject({
      type: "OWNER_FEATURE_REQUEST",
      message: "Notifications Salon: Add online consultation booking",
      href: `/businesses/${ids.business}/requests`,
    });
    expect((await domain.listDeveloperBusinessRequests(ids.developer, ids.business)).featureRequests).toHaveLength(1);
  });

  it("accepts public custom CRM requests without creating accounts and rate-limits the sender", async () => {
    const usersBefore = await db.prisma.user.count();
    const body = {
      name: "Prospective Client", phone: "+1 (212) 555-0100", callbackDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), callbackTime: "14:30", callbackTimeZone: "America/New_York",
      email: "prospect@example.test",
      businessName: "Prospect Studio",
      description: "We need inventory tracking, team scheduling, and recurring client reminders in one CRM.",
      website: "",
    };
    const crossOrigin = await customRequestRoute.POST(request("/api/custom-crm-requests", body, { origin: "https://foreign.test" }));
    expect(crossOrigin.status).toBe(403);
    const spam = await customRequestRoute.POST(request("/api/custom-crm-requests", { ...body, website: "spam" }, { origin: "http://localhost" }));
    expect(spam.status).toBe(200);
    expect(await db.prisma.customCrmRequest.count()).toBe(0);
    const submitted = await customRequestRoute.POST(request("/api/custom-crm-requests", body, { origin: "http://localhost" }));
    expect(submitted.status).toBe(200);
    expect(await db.prisma.user.count()).toBe(usersBefore);
    expect(await db.prisma.customCrmRequest.count({ where: { email: body.email } })).toBe(1);
    expect((await domain.listCustomCrmRequests(ids.developer))[0]).toMatchObject({
      name: body.name,
      email: body.email,
      businessName: body.businessName,
      phone: body.phone,
      callbackTimeZone: body.callbackTimeZone,
      callbackAt: expect.any(Date),
    });
    expect((await domain.listDeveloperNotifications(ids.developer)).some(notification => notification.type === "CUSTOM_CRM_REQUEST")).toBe(true);

    for (let attempt = 0; attempt < 4; attempt++) {
      await expect(domain.submitCustomCrmRequest(domain.CustomCrmRequest.parse(body))).resolves.toBeUndefined();
    }
    await expect(domain.submitCustomCrmRequest(domain.CustomCrmRequest.parse(body))).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("rejects missing callback details and rolls back the request if notification creation fails", async () => {
    const before = await db.prisma.customCrmRequest.count();
    const noticesBefore = await db.prisma.developerNotification.count();
    const body = { name: "Callback Owner", email: "callback@example.test", phone: "+1 212 555 0100", description: "A tailored website and customer workflow.",
      callbackDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), callbackTime: "14:30", callbackTimeZone: "America/New_York" };
    for (const invalid of [{ phone: "" }, { email: "" }, { callbackDate: "2000-01-01" }, { callbackTimeZone: "unknown" }]) {
      expect((await customRequestRoute.POST(request("/api/custom-crm-requests", { ...body, ...invalid }, { origin: "http://localhost" }))).status).toBe(400);
    }
    await db.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_callback_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test notification failure'; END $$`);
    await db.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_callback_notice BEFORE INSERT ON "DeveloperNotification" FOR EACH ROW EXECUTE FUNCTION reject_callback_notice()`);
    try {
      expect((await customRequestRoute.POST(request("/api/custom-crm-requests", body, { origin: "http://localhost" }))).status).toBe(500);
      expect(await db.prisma.customCrmRequest.count()).toBe(before);
      expect(await db.prisma.developerNotification.count()).toBe(noticesBefore);
    } finally {
      await db.prisma.$executeRawUnsafe(`DROP TRIGGER reject_callback_notice ON "DeveloperNotification"`);
      await db.prisma.$executeRawUnsafe(`DROP FUNCTION reject_callback_notice()`);
    }
  });

  it("keeps notification access and read state scoped to each developer", async () => {
    const notification = (await domain.listDeveloperNotifications(ids.developer))[0];
    session.userId = ids.developer;
    const response = await readRoute.POST(request("/api/notifications/read", { notificationId: notification.id }, { origin: "http://localhost" }));
    expect(response.status).toBe(200);
    expect((await domain.listDeveloperNotifications(ids.developer)).find(item => item.id === notification.id)?.readAt).toBeInstanceOf(Date);
    expect((await domain.listDeveloperNotifications(ids.teammate)).find(item => item.eventKey === notification.eventKey)?.readAt).toBeNull();
    await expect(domain.listDeveloperNotifications(ids.nonDeveloper)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const foreignRead = await readRoute.POST(request("/api/notifications/read", { notificationId: (await domain.listDeveloperNotifications(ids.teammate))[0].id }, { origin: "http://localhost" }));
    expect(foreignRead.status).toBe(404);
    session.userId = ids.owner;
    const ownerRead = await readRoute.POST(request("/api/notifications/read", { all: true }, { origin: "http://localhost" }));
    expect(ownerRead.status).toBe(404);
    session.userId = ids.developer;
    const readAll = await readRoute.POST(request("/api/notifications/read", { all: true }, { origin: "http://localhost" }));
    expect(readAll.status).toBe(200);
    expect(await domain.getUnreadDeveloperNotificationCount(ids.developer)).toBe(0);
    expect(await domain.getUnreadDeveloperNotificationCount(ids.teammate)).toBeGreaterThan(0);
  });

  it("authenticates, deduplicates, and notifies on external monitor state transitions", async () => {
    const down = { eventId: "monitor-event-down", monitorId: "web-production", status: "DOWN", observedAt: "2026-11-10T12:00:00.000Z" };
    const unauthorized = await monitorRoute.POST(request("/api/monitoring/webhook", down, { authorization: "Bearer wrong" }));
    expect(unauthorized.status).toBe(401);

    const auth = { authorization: `Bearer ${monitorSecret}` };
    const downResponse = await monitorRoute.POST(request("/api/monitoring/webhook", down, auth));
    expect(downResponse.status).toBe(200);
    expect(await downResponse.json()).toMatchObject({ duplicate: false, transition: true });
    expect((await db.prisma.developerNotification.count({ where: { type: "SERVICE_DOWN" } }))).toBe(3);

    const duplicate = await monitorRoute.POST(request("/api/monitoring/webhook", down, auth));
    expect(await duplicate.json()).toMatchObject({ duplicate: true, transition: false });
    const repeatedDown = await monitorRoute.POST(request("/api/monitoring/webhook", {
      ...down, eventId: "monitor-event-down-repeat", observedAt: "2026-11-10T12:01:00.000Z",
    }, auth));
    expect(await repeatedDown.json()).toMatchObject({ duplicate: false, transition: false });
    expect(await db.prisma.developerNotification.count({ where: { type: "SERVICE_DOWN" } })).toBe(3);
    expect(await db.prisma.externalMonitorState.findUnique({ where: { monitorId: "web-production" } })).toMatchObject({ status: "DOWN" });

    const recovered = await monitorRoute.POST(request("/api/monitoring/webhook", {
      ...down, eventId: "monitor-event-up", status: "UP", observedAt: "2026-11-10T12:02:00.000Z",
    }, auth));
    const recoveredResult = await recovered.json();
    expect(recoveredResult).toMatchObject({ duplicate: false, transition: true });
    expect(await db.prisma.developerNotification.count({ where: { type: "SERVICE_RECOVERED" } })).toBe(3);
    expect(await db.prisma.externalMonitorState.findUnique({ where: { monitorId: "web-production" } })).toMatchObject({ status: "UP" });

    const stale = await monitorRoute.POST(request("/api/monitoring/webhook", {
      ...down, eventId: "monitor-event-stale", status: "DOWN", observedAt: "2026-11-10T11:59:00.000Z",
    }, auth));
    expect(await stale.json()).toMatchObject({ stale: true, transition: false });
    expect(await db.prisma.externalMonitorState.findUnique({ where: { monitorId: "web-production" } })).toMatchObject({ status: "UP" });
  });
});
