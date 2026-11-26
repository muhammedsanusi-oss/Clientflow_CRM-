import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defaultWebsiteContent } from "../../packages/domain/src/website-content";

let db: typeof import("../../packages/db/src/index");
let api: typeof import("../../packages/domain/src/index");
beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index"); api = await import("../../packages/domain/src/index");
  await db.prisma.user.createMany({ data: [{ id: "always-editor-owner" }, { id: "always-editor-stranger" }, { id: "always-editor-staff" }] });
}, 30_000);
afterAll(async () => { await db?.prisma.$disconnect(); });

const plans = ["STANDARD", "CRM", "MANAGED"] as const;
const states = ["PENDING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"] as const;
describe("owners edit their own website regardless of subscription", () => {
  it.each(plans.flatMap(plan => states.map(state => [plan, state] as const)))("permits editing, uploading within allowance, and publishing for %s / %s", async (plan, state) => {
    const id = `always-edit-${plan}-${state}`;
    const status = state === "EXPIRED" ? "ACTIVE" : state;
    const expires = new Date(Date.now() + (state === "EXPIRED" ? -86400000 : 86400000));
    await db.prisma.business.create({ data: {
      id, name: id, description: "A fictional owner website", business_type: "BARBERSHOP", websiteTemplate: "BARBERSHOP", websitePlan: "PLUS",
      email: `${id}@example.test`, phone_number: "2125550100",
      employees: { create: [
        { user_id: "always-editor-owner", role: "OWNER", first_name: "Demo", last_name: "Owner", email: `${id}-owner@example.test`, phone_number: "2125550101", hire_date: new Date() },
        { user_id: "always-editor-staff", role: "STAFF", first_name: "Demo", last_name: "Staff", email: `${id}-staff@example.test`, phone_number: "2125550102", hire_date: new Date() },
      ] },
      demoSubscription: { create: { plan, status, periodEnd: expires } },
    } });
    const editor = await api.getWebsiteEditor("always-editor-owner", id);
    expect(editor).toMatchObject({ id, canChangeTemplate: false, maxImages: { STANDARD: 10, CRM: 20, MANAGED: 50 }[plan] });
    expect(editor.canSubmitFeatureRequests).toBe(state === "ACTIVE");
    await api.assertWebsiteEditorAccess("always-editor-owner", id);
    await api.assertWebsiteImageUploadAllowed("always-editor-owner", id, "offerings");
    const publication = {
      ...defaultWebsiteContent("BARBERSHOP"), name: id, description: "A fictional owner website", websiteTemplate: "BARBERSHOP" as const,
      email: `${id}@example.test`, phone_number: "2125550100", publicAddress: "", openingHours: "", version: 0,
      logoImage: "", heroImage: "", headline: `Published on ${state}`,
    };
    await api.publishWebsite("always-editor-owner", id, publication);
    expect((await api.getPublicWebsite(id))?.websiteContent?.headline).toBe(`Published on ${state}`);
    expect(await db.prisma.businessWebsiteRevision.count({ where: { businessId: id } })).toBe(1);
    expect(await db.prisma.demoSubscription.findUniqueOrThrow({ where: { businessId: id } })).toMatchObject({ plan, status, periodEnd: expires, version: 0 });
    if (state !== "ACTIVE" || plan === "STANDARD") {
      expect(await api.getCustomerBusinessForUser("always-editor-owner", id)).toBeNull();
      expect(await api.getPublicBookingOptions(id)).toBeNull();
    }
    if (state !== "ACTIVE") await expect(api.submitWebsiteFeatureRequest("always-editor-owner", id, { title: "A paid request", description: "Keep paid support separate." })).rejects.toMatchObject({ code: "NOT_FOUND" });
    for (const user of ["always-editor-stranger", "always-editor-staff"]) {
      await expect(api.getWebsiteEditor(user, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(api.assertWebsiteImageUploadAllowed(user, id, "offerings")).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(api.publishWebsite(user, id, { ...publication, version: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });
});
