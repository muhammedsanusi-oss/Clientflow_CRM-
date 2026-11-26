import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defaultWebsiteContent, WEBSITE_IMAGE_SECTIONS } from "../../packages/domain/src/website-content";
import { websiteImageLimit, countWebsiteImages } from "../../packages/domain/src/website-plans";
import type { PublishWebsiteInput } from "../../packages/domain/src/website-editing";

let db: typeof import("../../packages/db/src/index");
let api: typeof import("../../packages/domain/src/index");
beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index"); api = await import("../../packages/domain/src/index");
  await db.prisma.user.createMany({ data: [{ id: "photo-owner" }, { id: "photo-stranger" }] });
}, 30_000);
afterAll(async () => { await db?.prisma.$disconnect(); });

async function business(id: string, plan?: "STANDARD" | "CRM" | "MANAGED") {
  await db.prisma.business.create({ data: {
    id, name: id, description: "A fictional product business", business_type: "BAKERY", websiteTemplate: "BAKERY", websitePlan: "FREE",
    email: `${id}@example.test`, phone_number: "2125550100",
    employees: { create: { user_id: "photo-owner", role: "OWNER", first_name: "Demo", last_name: "Owner", email: `${id}-owner@example.test`, phone_number: "2125550101", hire_date: new Date() } },
    ...(plan ? { demoSubscription: { create: { plan, status: "ACTIVE", periodEnd: new Date(Date.now() + 86400000) } } } : {}),
  } });
}
const ref = (id: string, section: string, index: number) => `${id}/website/${section}-00000000-0000-4000-8000-${index.toString().padStart(12, "0")}.png`;
function values(id: string, count = 0): PublishWebsiteInput {
  const content = defaultWebsiteContent("BAKERY");
  let remaining = count;
  for (const section of WEBSITE_IMAGE_SECTIONS) {
    const length = Math.min(10, remaining); remaining -= length;
    content.sectionImages[section] = Array.from({ length }, (_, index) => ref(id, section, index));
  }
  return { ...content, name: id, description: "Fictional product photos", email: `${id}@example.test`, phone_number: "2125550100", publicAddress: "", openingHours: "", websiteTemplate: "BAKERY", version: 0, logoImage: "", heroImage: "" };
}

describe("subscription product photos", () => {
  it("publishes photo sizes and product captions with revisions, keeping them after movement", async () => {
    const id = "photos-sizing"; await business(id);
    const input = values(id, 1), photo = input.sectionImages.header[0];
    input.photoDetails = { [photo]: { widthPercent: 66, name: "Strawberry cake", priceCents: 2450 } };
    await api.publishWebsite("photo-owner", id, input);
    expect((await api.getPublicWebsite(id))?.websiteContent?.photoDetails).toEqual(input.photoDetails);
    expect((await api.getWebsiteEditor("photo-owner", id)).photoDetails).toEqual(input.photoDetails);
    const moved = { ...input, version: 1, sectionImages: { ...input.sectionImages, header: [], offerings: [photo] } };
    await api.publishWebsite("photo-owner", id, moved);
    expect((await api.getPublicWebsite(id))?.websiteContent?.photoDetails[photo]).toEqual(input.photoDetails[photo]);
    const revision = await db.prisma.businessWebsiteRevision.findUniqueOrThrow({ where: { businessId_version: { businessId: id, version: 2 } } });
    expect(revision.before).toMatchObject({ photoDetails: input.photoDetails });
    expect(revision.after).toMatchObject({ photoDetails: input.photoDetails });
    await expect(api.publishWebsite("photo-owner", id, moved)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.publishWebsite("photo-stranger", id, { ...moved, version: 2 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(countWebsiteImages(moved)).toBe(1);
  });
  it("keeps legacy photos unsized and rejects forged photo settings and invalid product details", async () => {
    const id = "photos-invalid-details"; await business(id);
    const input = values(id, 1), photo = input.sectionImages.header[0];
    expect((await api.getWebsiteEditor("photo-owner", id)).photoDetails).toEqual({});
    for (const detail of [{ widthPercent: 24 }, { widthPercent: 101 }, { widthPercent: 42.5 }, { name: "A", priceCents: 0 }, { name: "A", priceCents: 1000001 }, { name: "A", priceCents: 1.1 }, { name: " ", priceCents: 100 }, { name: "x".repeat(121) }, { widthPercent: 50, arbitrary: true }]) {
      await expect(api.publishWebsite("photo-owner", id, { ...input, photoDetails: { [photo]: detail } })).rejects.toThrow();
    }
    for (const unknown of [ref("foreign", "header", 0), ref(id, "offerings", 9)]) {
      await expect(api.publishWebsite("photo-owner", id, { ...input, photoDetails: { [unknown]: { widthPercent: 50 } } })).rejects.toThrow();
    }
    expect(await db.prisma.businessWebsiteRevision.count({ where: { businessId: id } })).toBe(0);
    await api.publishWebsite("photo-owner", id, input);
    expect((await api.getPublicWebsite(id))?.websiteContent?.photoDetails).toEqual({});
  });
  it.each([["STANDARD", 10], ["CRM", 20], ["MANAGED", 50]] as const)("enforces %s at %i across upload, publication and editor regardless of saved tier", async (plan, limit) => {
    const id = `photos-${plan.toLowerCase()}`;
    await business(id, plan);
    expect((await api.getWebsiteEditor("photo-owner", id)).maxImages).toBe(limit);
    expect(api.PublishWebsite.safeParse({ ...values(id), maxImages: 999 }).success).toBe(false);
    await api.assertWebsiteImageUploadAllowed("photo-owner", id, "offerings");
    await api.publishWebsite("photo-owner", id, values(id, limit));
    await expect(api.assertWebsiteImageUploadAllowed("photo-owner", id, "offerings")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.publishWebsite("photo-owner", id, { ...values(id, limit + 1), version: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.prisma.businessWebsiteRevision.count({ where: { businessId: id } })).toBe(1);
  });

  it("uses legacy allowances and counts repeated logo references once", () => {
    expect(websiteImageLimit(null, "FREE")).toBe(10);
    expect(websiteImageLimit(null, "PLUS")).toBe(20);
    expect(websiteImageLimit(null, "PREMIUM")).toBe(50);
    expect(websiteImageLimit(null, null)).toBeNull();
    const input = values("legacy", 1);
    input.logoImage = input.sectionImages.header[0]; input.sectionImages.about.push(input.logoImage);
    expect(countWebsiteImages(input)).toBe(1);
  });

  it("moves same-business photos between sections and records before/after placements atomically", async () => {
    const id = "photos-placement";
    await business(id);
    const input = values(id, 2);
    await api.publishWebsite("photo-owner", id, input);
    const moved = { ...input, version: 1, sectionImages: { ...input.sectionImages, header: [input.sectionImages.header[1]], offerings: [input.sectionImages.header[0]] } };
    await api.publishWebsite("photo-owner", id, moved);
    expect(countWebsiteImages(moved)).toBe(2);
    expect(await api.getPublicWebsiteImage(id, "offerings-0")).toBe(input.sectionImages.header[0]);
    expect(await api.getPublicWebsiteImage(id, "header-0")).toBe(input.sectionImages.header[1]);
    expect(await api.getPublicWebsiteImage(id, "header-1")).toBeNull();
    const revision = await db.prisma.businessWebsiteRevision.findUniqueOrThrow({ where: { businessId_version: { businessId: id, version: 2 } } });
    expect(revision.before).toMatchObject({ sectionImages: input.sectionImages });
    expect(revision.after).toMatchObject({ sectionImages: moved.sectionImages });
    await expect(api.publishWebsite("photo-owner", id, moved)).rejects.toMatchObject({ code: "CONFLICT" });
    for (const invalid of [ref("foreign", "hero", 0), `${id}/website/../../private.png`, `${id}/other/hero-file.png`, `https://example.test/photo.png`, ref(id, "unknown", 0)]) {
      await expect(api.publishWebsite("photo-owner", id, { ...moved, version: 2, sectionImages: { ...moved.sectionImages, offerings: [invalid] } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(api.publishWebsite("photo-stranger", id, { ...moved, version: 2 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.assertWebsiteImageUploadAllowed("photo-stranger", id, "offerings")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.publishWebsite("photo-owner", id, { ...moved, version: 2, sectionImages: { ...moved.sectionImages, offerings: Array.from({ length: 11 }, (_, index) => ref(id, "hero", index)) } })).rejects.toThrow();
    expect(await db.prisma.businessWebsiteRevision.count({ where: { businessId: id } })).toBe(2);
  });

  it("uses the current plan after upgrades/downgrades while preserving existing public photos", async () => {
    const id = "photos-plan-change";
    await business(id, "MANAGED");
    const input = values(id, 25);
    await api.publishWebsite("photo-owner", id, input);
    await db.prisma.demoSubscription.update({ where: { businessId: id }, data: { plan: "STANDARD" } });
    expect((await api.getWebsiteEditor("photo-owner", id)).maxImages).toBe(10);
    expect((await api.getPublicWebsite(id))?.websiteContent?.sectionImages.features.length).toBe(5);
    await expect(api.assertWebsiteImageUploadAllowed("photo-owner", id, "offerings")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.publishWebsite("photo-owner", id, { ...input, version: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    await api.publishWebsite("photo-owner", id, { ...values(id, 9), version: 1 });
    await api.assertWebsiteImageUploadAllowed("photo-owner", id, "offerings");
    await db.prisma.demoSubscription.update({ where: { businessId: id }, data: { plan: "CRM" } });
    expect((await api.getWebsiteEditor("photo-owner", id)).maxImages).toBe(20);
    await api.publishWebsite("photo-owner", id, { ...values(id, 20), version: 2 });
    await db.prisma.demoSubscription.update({ where: { businessId: id }, data: { status: "CANCELED" } });
    await expect(api.assertWebsiteImageUploadAllowed("photo-owner", id, "offerings")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await api.getPublicWebsiteImage(id, "hero-9")).toBe(ref(id, "hero", 9));
    await db.prisma.demoSubscription.update({ where: { businessId: id }, data: { status: "ACTIVE", periodEnd: new Date(Date.now() - 1000) } });
    expect(await api.getWebsiteEditor("photo-owner", id)).toMatchObject({ id, maxImages: 20 });
    await db.prisma.demoSubscription.update({ where: { businessId: id }, data: { periodEnd: new Date(Date.now() + 86400000) } });
    await db.prisma.employee.updateMany({ where: { business_id: id, user_id: "photo-owner" }, data: { is_active: false } });
    await expect(api.assertWebsiteImageUploadAllowed("photo-owner", id, "offerings")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
