import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ManagedMutation } from "../../packages/domain/src/managed-service";

const identity = vi.hoisted(() => ({ userId: "managed-owner" as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => identity.userId }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");
let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/managed-service");
let subscriptions: typeof import("../../packages/domain/src/demo-subscriptions");
let notifications: typeof import("../../packages/domain/src/developer-notifications");
let api: typeof import("../../apps/web/app/api/managed-service/route");
const owner = "managed-owner", developer = "managed-developer", teammate = "managed-teammate";

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index");
  domain = await import("../../packages/domain/src/managed-service");
  subscriptions = await import("../../packages/domain/src/demo-subscriptions");
  notifications = await import("../../packages/domain/src/developer-notifications");
  api = await import("../../apps/web/app/api/managed-service/route");
  for (const id of [owner, developer, teammate, "managed-foreign", "managed-staff", "managed-ungranted-developer"]) {
    await db.prisma.user.create({ data: { id, name: id, isDeveloper: [developer, teammate, "managed-ungranted-developer"].includes(id) } });
  }
}, 30_000);
afterAll(async () => { vi.useRealTimers(); await db?.prisma.$disconnect(); });
async function business() {
  const id = randomUUID();
  await db.prisma.business.create({ data: { id, name: "Managed studio", description: "Demo website", business_type: "OTHER", email: "studio@example.test", phone_number: "2125550111", websiteTemplate: "CONTACT",
    demoSubscription: { create: { plan: "MANAGED", status: "ACTIVE", periodStart: new Date("2026-01-01Z"), periodEnd: new Date("2035-01-01Z") } },
    employees: { create: [owner, "managed-staff"].map(user_id => ({ user_id, first_name: user_id, last_name: "Test", role: user_id === owner ? "OWNER" : "STAFF", email: `${user_id}@example.test`, phone_number: "2125550111", hire_date: new Date() })) },
    developerAccess: { create: [developer, teammate].map(developerId => ({ developerId })) },
  } });
  return id;
}
const create = (businessId: string) => domain.mutateManagedService(owner, { action: "CREATE", businessId, submissionKey: randomUUID(), title: "Update opening hours", description: "Change the existing hours to 9–5 weekdays." });
async function start(businessId: string) {
  const request = await create(businessId);
  return domain.mutateManagedService(developer, { action: "START", businessId, requestId: request.id, expectedVersion: 0 });
}
function post(body: unknown, origin = "http://localhost") {
  return api.POST(new Request("http://localhost/api/managed-service", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
}

describe.sequential("managed-service disposable lifecycle drill", () => {
  it("submits once, notifies granted developers, records work, and completes with owner-visible history", async () => {
    const businessId = await business();
    const input = { action: "CREATE" as const, businessId, submissionKey: randomUUID(), title: "Hours correction", description: "Use weekdays, 9–5." };
    const response = await post(input);
    expect(response.status).toBe(200);
    const request = (await response.json()).request;
    expect((await post(input)).status).toBe(200);
    expect(await db.prisma.managedServiceRequest.count({ where: { businessId } })).toBe(1);
    expect(await db.prisma.managedServiceEvent.count({ where: { requestId: request.id } })).toBe(1);
    const notices = await db.prisma.developerNotification.findMany({ where: { businessId, type: "MANAGED_SERVICE_REQUEST" } });
    expect(notices.map(item => item.developerId).sort()).toEqual([developer, teammate].sort());
    expect(notices.every(item => item.href === `/businesses/${businessId}/managed-service`)).toBe(true);
    expect((await domain.getManagedService(owner, businessId)).remaining).toBe(30);
    await domain.mutateManagedService(developer, { action: "START", businessId, requestId: request.id, expectedVersion: 0 });
    await expect(domain.mutateManagedService(developer, { action: "COMPLETE", businessId, requestId: request.id, expectedVersion: 1, note: "Done" })).rejects.toMatchObject({ code: "CONFLICT" });
    await domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 12, note: "Updated and published the existing hours." });
    await domain.mutateManagedService(developer, { action: "COMPLETE", businessId, requestId: request.id, expectedVersion: 2, note: "Hours published; please review the website." });
    const data = await domain.getManagedService(owner, businessId);
    expect(data).toMatchObject({ used: 12, remaining: 18 });
    expect(data.requests[0]).toMatchObject({ status: "COMPLETED", version: 3 });
    expect(data.requests[0].events.map(event => event.action)).toEqual(["CREATE", "START", "LOG_TIME", "COMPLETE"]);
    const { ManagedServiceView } = await import("../../apps/web/components/managed-service-view");
    const html = renderToStaticMarkup(createElement(ManagedServiceView, { data }));
    expect(html).toContain("18 of 30 minutes available");
    expect(html).toContain("Hours published; please review the website.");
    expect(html).toContain("Platform bug fixes and your own website edits");
    expect(html).not.toContain("Request actions");
    expect(await db.prisma.businessWebsiteContent.count({ where: { businessId } })).toBe(0);
  });
  it("serializes different requests against one allowance and accepts requests at zero balance", async () => {
    const businessId = await business();
    const first = await start(businessId), second = await start(businessId);
    const results = await Promise.allSettled([first, second].map((request, index) => domain.mutateManagedService(index ? teammate : developer, {
      action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 20, note: "Existing website text update",
    })));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    expect((await domain.getManagedService(owner, businessId)).remaining).toBe(10);
    const loser = await db.prisma.managedServiceRequest.findFirstOrThrow({ where: { businessId, version: 1 } });
    await domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: loser.id, expectedVersion: 1, minutes: 10, note: "Finished the content update" });
    expect((await domain.getManagedService(owner, businessId)).remaining).toBe(0);
    expect((await create(businessId)).status).toBe("SUBMITTED");
    await expect(domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: loser.id, expectedVersion: 2, minutes: 1, note: "Extra time" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.prisma.managedServiceTime.count({ where: { request: { businessId } } })).toBe(2);
  });
  it("rejects stale changes and invalid transitions without duplicate work", async () => {
    const businessId = await business(), request = await start(businessId);
    const command = { action: "LOG_TIME" as const, businessId, requestId: request.id, expectedVersion: 1, minutes: 5, note: "Replaced supplied photo" };
    const results = await Promise.allSettled([domain.mutateManagedService(developer, command), domain.mutateManagedService(teammate, command)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    identity.userId = developer;
    expect((await post(command)).status).toBe(409);
    await expect(domain.mutateManagedService(owner, { action: "CANCEL", businessId, requestId: request.id, expectedVersion: 2 })).rejects.toMatchObject({ code: "CONFLICT" });
    await domain.mutateManagedService(developer, { action: "COMPLETE", businessId, requestId: request.id, expectedVersion: 2, note: "Photo updated" });
    const time = await db.prisma.managedServiceTime.findFirstOrThrow({ where: { requestId: request.id } });
    await expect(domain.mutateManagedService(developer, { action: "VOID_TIME", businessId, requestId: request.id, expectedVersion: 3, entryId: time.id, note: "Correction" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.prisma.managedServiceTime.count({ where: { requestId: request.id } })).toBe(1);
    identity.userId = owner;
  });
  it("preserves monthly usage through downgrade, failure, cancellation, and recovery", async () => {
    const businessId = await business(), request = await start(businessId);
    await domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 12, note: "Updated existing text" });
    await subscriptions.simulateSubscription(owner, { businessId, plan: "CRM", scenario: "PAY_SUCCESS", expectedVersion: 0 });
    const history = await domain.getManagedService(owner, businessId);
    expect(history).toMatchObject({ used: 12, remaining: 0, business: { eligible: false } });
    await expect(domain.mutateManagedService(developer, { action: "COMPLETE", businessId, requestId: request.id, expectedVersion: 2, note: "Done" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await subscriptions.simulateSubscription(owner, { businessId, plan: "MANAGED", scenario: "PAY_SUCCESS", expectedVersion: 1 });
    expect((await domain.getManagedService(owner, businessId)).remaining).toBe(18);
    await subscriptions.simulateSubscription(owner, { businessId, plan: "MANAGED", scenario: "PAY_FAILURE", expectedVersion: 2 });
    await expect(create(businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await subscriptions.simulateSubscription(owner, { businessId, plan: "MANAGED", scenario: "PAY_SUCCESS", expectedVersion: 3 });
    await subscriptions.simulateSubscription(owner, { businessId, plan: "MANAGED", scenario: "CANCEL", expectedVersion: 4 });
    expect((await domain.getManagedService(owner, businessId)).used).toBe(12);
    await subscriptions.simulateSubscription(owner, { businessId, plan: "MANAGED", scenario: "PAY_SUCCESS", expectedVersion: 5 });
    expect((await domain.getManagedService(owner, businessId)).remaining).toBe(18);
  });
  it("uses UTC months, never grants advance renewal minutes, and restores voided time to its original month", async () => {
    const businessId = await business(), request = await start(businessId);
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2027-01-31T23:59:59Z"));
      await domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 10, note: "Updated existing service prices" });
      const january = await domain.getManagedService(owner, businessId);
      expect(january).toMatchObject({ month: "2027-01", used: 10, remaining: 20 });
      await subscriptions.simulateSubscription(owner, { businessId, plan: "MANAGED", scenario: "PAY_SUCCESS", expectedVersion: 0 });
      expect((await domain.getManagedService(owner, businessId)).remaining).toBe(20);
      vi.setSystemTime(new Date("2027-02-01T00:00:00Z"));
      expect(await domain.getManagedService(owner, businessId)).toMatchObject({ month: "2027-02", used: 0, remaining: 30 });
      await domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 2, minutes: 5, note: "Updated existing contact text" });
      const entry = january.requests[0].timeEntries[0];
      await domain.mutateManagedService(developer, { action: "VOID_TIME", businessId, requestId: request.id, expectedVersion: 3, entryId: entry.id, note: "January entry recorded in error" });
      expect(await domain.getManagedService(owner, businessId)).toMatchObject({ used: 5, remaining: 25 });
      expect((await db.prisma.managedServiceTime.findUniqueOrThrow({ where: { id: entry.id } })).voidReason).toBe("January entry recorded in error");
      vi.setSystemTime(new Date("2036-01-01Z"));
      expect((await domain.getManagedService(owner, businessId)).business.eligible).toBe(false);
      await expect(domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 4, minutes: 1, note: "Expired" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally { vi.useRealTimers(); }
  });
  it("allows owner cancellation and developer decline without consuming time", async () => {
    const businessId = await business(), request = await create(businessId);
    await domain.mutateManagedService(owner, { action: "CANCEL", businessId, requestId: request.id, expectedVersion: 0 });
    const second = await create(businessId);
    await domain.mutateManagedService(developer, { action: "DECLINE", businessId, requestId: second.id, expectedVersion: 0, note: "New functionality requires a separate quote." });
    expect(await domain.getManagedService(owner, businessId)).toMatchObject({ used: 0, remaining: 30 });
    expect(await db.prisma.websiteFeatureRequest.count({ where: { businessId } })).toBe(0);
  });
});

describe.sequential("managed service access and atomicity", () => {
  it("denies inactive plans and legacy access for owner and developer work", async () => {
    const businessId = await business();
    const request = await start(businessId);
    for (const state of [
      { plan: "STANDARD", status: "ACTIVE" }, { plan: "CRM", status: "ACTIVE" },
      { plan: "MANAGED", status: "PENDING" }, { plan: "MANAGED", status: "PAST_DUE" }, { plan: "MANAGED", status: "CANCELED" },
    ] as const) {
      await db.prisma.demoSubscription.update({ where: { businessId }, data: state });
      await expect(create(businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 1, note: "Blocked" })).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect((await domain.getManagedService(owner, businessId)).requests).toHaveLength(1);
    }
    await db.prisma.demoSubscription.delete({ where: { businessId } });
    await expect(create(businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("isolates owners, staff, developers, revoked grants, and notifications", async () => {
    const businessId = await business(), request = await create(businessId);
    for (const userId of ["managed-foreign", "managed-staff", "managed-ungranted-developer"]) {
      await expect(domain.getManagedService(userId, businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(domain.mutateManagedService(userId, { action: "START", businessId, requestId: request.id, expectedVersion: 0 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(domain.mutateManagedService(owner, { action: "START", businessId, requestId: request.id, expectedVersion: 0 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.mutateManagedService(developer, { action: "CANCEL", businessId, requestId: request.id, expectedVersion: 0 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getManagedService(owner, "unknown")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const foreign = await business();
    await expect(domain.mutateManagedService(developer, { action: "START", businessId: foreign, requestId: request.id, expectedVersion: 0 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.employee.updateMany({ where: { business_id: businessId, user_id: owner }, data: { is_active: false } });
    await expect(domain.getManagedService(owner, businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const notice = (await notifications.listDeveloperNotifications(teammate)).find(item => item.businessId === businessId)!;
    expect(notice).toBeDefined();
    await db.prisma.developerBusinessAccess.delete({ where: { developerId_businessId: { developerId: teammate, businessId } } });
    expect((await notifications.listDeveloperNotifications(teammate)).some(item => item.businessId === businessId)).toBe(false);
    await expect(notifications.markDeveloperNotificationRead(teammate, notice.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getManagedService(teammate, businessId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it.each(["ManagedServiceEvent", "DeveloperNotification"])("rolls back request creation when %s cannot be written", async table => {
    const businessId = await business();
    await db.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_managed_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected managed write failure'; END $$`);
    await db.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_managed_write BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION reject_managed_write()`);
    try {
      const result = await post({ action: "CREATE", businessId, submissionKey: randomUUID(), title: "Rollback test", description: "Nothing should remain." });
      expect(result.status).toBe(500);
      expect(await result.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
      expect(await db.prisma.managedServiceRequest.count({ where: { businessId } })).toBe(0);
      expect(await db.prisma.developerNotification.count({ where: { businessId } })).toBe(0);
    } finally {
      await db.prisma.$executeRawUnsafe(`DROP TRIGGER reject_managed_write ON "${table}"`);
      await db.prisma.$executeRawUnsafe('DROP FUNCTION reject_managed_write()');
    }
  });
  it("rolls back deducted time and request version when audit persistence fails", async () => {
    const businessId = await business(), request = await start(businessId);
    await db.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_managed_time() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected history failure'; END $$`);
    await db.prisma.$executeRawUnsafe('CREATE TRIGGER reject_managed_time BEFORE INSERT ON "ManagedServiceEvent" FOR EACH ROW EXECUTE FUNCTION reject_managed_time()');
    try {
      await expect(domain.mutateManagedService(developer, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 5, note: "Rollback" })).rejects.toBeDefined();
      expect((await domain.getManagedService(owner, businessId)).remaining).toBe(30);
      expect(await db.prisma.managedServiceRequest.findUnique({ where: { id: request.id } })).toMatchObject({ version: 1 });
    } finally {
      await db.prisma.$executeRawUnsafe('DROP TRIGGER reject_managed_time ON "ManagedServiceEvent"');
      await db.prisma.$executeRawUnsafe('DROP FUNCTION reject_managed_time()');
    }
  });
  it("validates HTTP input, rejects cross-origin and forged fields, and requires sign-in", async () => {
    const businessId = await business(), request = await start(businessId);
    identity.userId = developer;
    const valid: ManagedMutation = { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: 1, minutes: 1, note: "Existing content" };
    for (const invalid of [{ ...valid, minutes: 31 }, { ...valid, minutes: 0 }, { ...valid, minutes: 1.5 }, { ...valid, note: " " }, { ...valid, month: "2000-01" }, { ...valid, actorId: owner }]) {
      expect((await post(invalid)).status).toBe(400);
    }
    expect((await post(valid, "https://foreign.test")).status).toBe(403);
    identity.userId = "managed-foreign";
    expect((await post(valid)).status).toBe(404);
    identity.userId = null;
    expect((await post(valid)).status).toBe(401);
    const page = await import("../../apps/web/app/managed-service/page");
    await expect(page.default({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/login");
    identity.userId = owner;
  });
});
