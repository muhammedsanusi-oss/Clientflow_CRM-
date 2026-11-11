/*
 * Code guide: tests/integration/website-editing.test.ts
 * Automated regression tests for developer website editing. Assertions document expected behavior and failure
 * cases; inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than changing the
 * running local project data.
 */
/*
 * Import connection: vitest.
 * Test runner assertions, lifecycle hooks, spies, and mocks. This import is test support, not a production
 * API.
 * beforeAll: Sets up resources once before this test suite runs.
 * afterAll: Closes suite resources after testing.
 * describe: Groups related regression scenarios in the test runner.
 * it: Defines a scenario whose assertions must pass.
 * expect: Checks actual values or failures against the expected behavior.
 * vi: Provides test spies and module mocks; does not alter production authorization.
 */
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
/*
 * Import connection: ../../packages/domain/src/website-content -> packages/domain/src/website-content.ts.
 * defaultWebsiteContent: Copies the selected template default headings, button text, feature labels, and
 * offerings into an editable content object. Does not read or write the database.
 */
import { defaultWebsiteContent } from "../../packages/domain/src/website-content";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => session.userId }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
let action: typeof import("../../apps/web/app/businesses/[id]/website/actions");
const ids = { developer: "editor-dev", teammate: "editor-teammate", stranger: "editor-stranger", owner: "editor-owner", otherOwner: "editor-other-owner" };
const siteId = "editable-business";
const otherId = "other-editable-business";

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  // Test import connection: ../../packages/db/src/index -> packages/db/src/index.ts. Loads the real module or
  // its configured mock for this scenario.
  db = await import("../../packages/db/src/index");
  // Test import connection: ../../packages/domain/src/index -> packages/domain/src/index.ts. Loads the real
  // module or its configured mock for this scenario.
  domain = await import("../../packages/domain/src/index");
  // Test import connection: ../../apps/web/app/businesses/[id]/website/actions ->
  // apps/web/app/businesses/[id]/website/actions.ts. Loads the real module or its configured mock for this
  // scenario.
  action = await import("../../apps/web/app/businesses/[id]/website/actions");
  for (const [role, id] of Object.entries(ids)) await db.prisma.user.create({ data: {
    id, email: `${id}@example.test`, isDeveloper: ["developer", "teammate", "stranger"].includes(role),
  } });
  for (const [id, owner] of [[siteId, ids.owner], [otherId, ids.otherOwner]]) {
    await db.prisma.business.create({ data: {
      id, name: id, business_type: "SALON", websiteTemplate: "SALON",
      description: "An existing salon website", email: `${id}@public.test`, phone_number: "2125550142",
      publicAddress: "Old address", openingHours: "Weekdays",
      employees: { create: { user_id: owner, first_name: "Business", last_name: "Owner", email: `${owner}@example.test`, phone_number: "2125550142", role: "OWNER", hire_date: new Date() } },
    } });
  }
  await db.prisma.developerBusinessAccess.createMany({ data: [ids.developer, ids.teammate].map(developerId => ({ businessId: siteId, developerId })) });
}, 30000);

afterAll(async () => { await db?.prisma.$disconnect(); });

function editableValues(editor: Awaited<ReturnType<typeof domain.getWebsiteEditor>>) {
  const {
    id, demoSubscription, canChangeTemplate, websitePlan, maxImages, imageCount, canAddCustomSections,
    canSubmitFeatureRequests, featureRequestCount, featureRequestLimit, ...input
  } = editor;
  expect(typeof canChangeTemplate).toBe("boolean");
  return input;
}

async function values(userId = ids.developer, businessId = siteId) {
  return editableValues(await domain.getWebsiteEditor(userId, businessId));
}

describe.sequential("developer website editing", () => {
  const imageReference = (section: string, index: number) =>
    `${siteId}/website/${section}-00000000-0000-4000-8000-${index.toString().padStart(12, "0")}.png`;
  const imageSections = (count: number) => {
    const images = { header: [] as string[], hero: [] as string[], features: [] as string[], about: [] as string[], offerings: [] as string[], contact: [] as string[] };
    let remaining = count;
    for (const section of Object.keys(images) as Array<keyof typeof images>) {
      const length = Math.min(10, remaining);
      images[section] = Array.from({ length }, (_, index) => imageReference(section, index));
      remaining -= length;
    }
    if (remaining > 0) throw new Error("Requested image fixture exceeds section capacity.");
    return images;
  };

  it("keeps older sites unchanged and initializes unsaved edits from template defaults", async () => {
    const editor = await domain.getWebsiteEditor(ids.developer, siteId);
    expect(editor).toMatchObject({
      id: siteId, version: 0, canChangeTemplate: true, ...defaultWebsiteContent("SALON", "An existing salon website"),
      logoImage: "", heroImage: "",
    });
    expect((await domain.getPublicWebsite(siteId))?.websiteContent).toBeNull();
    expect(await db.prisma.businessWebsiteRevision.count()).toBe(0);
  });

  it("publishes public content and history atomically without changing owner identity or the other business", async () => {
    const ownerBefore = await db.prisma.user.findUniqueOrThrow({ where: { id: ids.owner } });
    const otherBefore = await domain.getPublicWebsite(otherId);
    session.userId = ids.developer;
    const result = await action.publishWebsiteAction(siteId, {
      ...await values(), name: "Updated salon", headline: "A new look for you", openingHours: "Monday to Saturday",
      email: "new-contact@public.test", offerings: ["Color consultations", "Personal styling"],
      aboutText: "A different story from the hero description.",
    });
    expect(result.publication?.version).toBe(1);
    expect(await domain.getPublicWebsite(siteId)).toMatchObject({
      name: "Updated salon", email: "new-contact@public.test", description: "An existing salon website",
      websiteContent: { headline: "A new look for you", aboutText: "A different story from the hero description." },
    });
    expect(await domain.getOwnerWebsite(ids.owner, siteId)).toMatchObject({ websiteContent: { headline: "A new look for you", publishedAt: expect.any(Date) } });
    const revision = await db.prisma.businessWebsiteRevision.findUniqueOrThrow({ where: { businessId_version: { businessId: siteId, version: 1 } } });
    expect(revision.publishedById).toBe(ids.developer);
    expect(revision.before).toMatchObject({ name: siteId, headline: defaultWebsiteContent("SALON").headline });
    expect(revision.after).toMatchObject({ name: "Updated salon", headline: "A new look for you" });
    expect(await db.prisma.user.findUniqueOrThrow({ where: { id: ids.owner } })).toEqual(ownerBefore);
    expect(await domain.getPublicWebsite(otherId)).toEqual(otherBefore);
    const publicContent = (await domain.getPublicWebsite(siteId))!.websiteContent!;
    expect(Object.keys(publicContent).sort()).toEqual([
      "eyebrow", "headline", "sectionTitle", "buttonLabel", "features", "offerings",
      "fontFamily", "textColor", "textScale", "sectionImages", "additionalSections", "aboutText", "logoImage", "heroImage",
    ].sort());
    expect(JSON.stringify(publicContent)).not.toContain(ids.developer);
  });

  it("rejects stale versions and concurrent first publication without overwriting the winner", async () => {
    const stale = { ...await values(), version: 0, headline: "Stale overwrite" };
    await expect(domain.publishWebsite(ids.developer, siteId, stale)).rejects.toMatchObject({ code: "CONFLICT" });
    const fresh = await values();
    const results = await Promise.allSettled([
      domain.publishWebsite(ids.developer, siteId, { ...fresh, headline: "First developer" }),
      domain.publishWebsite(ids.teammate, siteId, { ...fresh, headline: "Second developer" }),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
    expect((await values()).version).toBe(2);
    // Exercise the same race when no content row exists yet.
    await db.prisma.developerBusinessAccess.create({ data: { businessId: otherId, developerId: ids.developer } });
    const first = editableValues(await domain.getWebsiteEditor(ids.developer, otherId));
    const initialResults = await Promise.allSettled([
      domain.publishWebsite(ids.developer, otherId, first),
      domain.publishWebsite(ids.developer, otherId, first),
    ]);
    expect(initialResults.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((initialResults.find(result => result.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "CONFLICT" });
    expect(await db.prisma.businessWebsiteRevision.count({ where: { businessId: otherId } })).toBe(1);
  });

  it("rejects unauthorized editor reads, writes and revoked roles/grants", async () => {
    const input = await values();
    for (const userId of [ids.stranger, ids.otherOwner, "missing"]) {
      await expect(domain.getWebsiteEditor(userId, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(domain.publishWebsite(userId, siteId, input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(domain.getWebsiteEditor(ids.developer, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.developerBusinessAccess.delete({ where: { developerId_businessId: { developerId: ids.teammate, businessId: siteId } } });
    await expect(domain.publishWebsite(ids.teammate, siteId, input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.user.update({ where: { id: ids.developer }, data: { isDeveloper: false } });
    await expect(domain.publishWebsite(ids.developer, siteId, input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.user.update({ where: { id: ids.developer }, data: { isDeveloper: true, mustChangePassword: true } });
    await expect(domain.getWebsiteEditor(ids.developer, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.user.update({ where: { id: ids.developer }, data: { mustChangePassword: false } });
    session.userId = null;
    await expect(action.publishWebsiteAction(siteId, input)).rejects.toThrow("REDIRECT:/login");
  });

  it("isolates private owner views and filters the owner website selector", async () => {
    await expect(domain.getOwnerWebsite(ids.otherOwner, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getOwnerWebsite(ids.developer, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getWebsiteEditor(ids.otherOwner, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await domain.assertWebsiteEditorAccess(ids.owner, siteId)).toBe("owner");
    expect(await domain.assertWebsiteEditorAccess(ids.developer, siteId)).toBe("developer");
    expect(await domain.listOwnerWebsites(ids.owner)).toEqual([{ id: siteId, name: "Updated salon" }]);
    await db.prisma.employee.updateMany({ where: { user_id: ids.owner }, data: { is_active: false } });
    await expect(domain.getOwnerWebsite(ids.owner, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getWebsiteEditor(ids.owner, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.employee.updateMany({ where: { user_id: ids.owner }, data: { is_active: true, role: "STAFF" } });
    await expect(domain.getOwnerWebsite(ids.owner, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.getWebsiteEditor(ids.owner, siteId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.prisma.employee.updateMany({ where: { user_id: ids.owner }, data: { role: "OWNER" } });
  });

  it("validates boundaries and ownership fields before publishing", async () => {
    const input = await values();
    session.userId = ids.developer;
    for (const invalid of [
      { ...input, websiteTemplate: "CUSTOM" }, { ...input, ownerId: ids.owner },
      { ...input, headline: "x".repeat(201) }, { ...input, offerings: Array(7).fill("Too many") },
      { ...input, email: "invalid" }, { ...input, version: -1 }, { ...input, features: [""] },
      { ...input, fontFamily: "Comic Sans" }, { ...input, additionalSections: Array(7).fill({ heading: "Heading", body: "Text" }) },
      { ...input, sectionImages: { ...input.sectionImages, hero: Array(11).fill("site/website/hero-12345678-1234-1234-1234-123456789abc.png") } },
      { ...input, additionalSections: [{ heading: "Heading", body: "Text", images: Array(11).fill(imageReference("custom", 0)) }] },
    ]) expect((await action.publishWebsiteAction(siteId, invalid)).error?.code).toBe("VALIDATION");
    await expect(domain.publishWebsite(ids.developer, siteId, { ...input, logoImage: "other-business/website/logo-fake.png" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(domain.publishWebsite(ids.developer, siteId, {
      ...input,
      sectionImages: { ...input.sectionImages, hero: ["other-business/website/hero-00000000-0000-4000-8000-000000000000.png"] },
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await values()).version).toBe(input.version);
  });

  it("rolls back all publication writes when history persistence fails", async () => {
    const before = await values();
    await db.prisma.$executeRawUnsafe(`CREATE FUNCTION fail_website_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'history unavailable'; END $$`);
    await db.prisma.$executeRawUnsafe(`CREATE TRIGGER fail_history BEFORE INSERT ON "BusinessWebsiteRevision" FOR EACH ROW EXECUTE FUNCTION fail_website_history()`);
    try {
      session.userId = ids.developer;
      const response = await action.publishWebsiteAction(siteId, { ...before, name: "Should roll back", headline: "Should not publish" });
      expect(response.error).toEqual({ code: "INTERNAL_ERROR", message: "Something went wrong" });
      expect(await values()).toEqual(before);
      expect(await db.prisma.businessWebsiteRevision.count({ where: { businessId: siteId } })).toBe(2);
    } finally {
      await db.prisma.$executeRawUnsafe('DROP TRIGGER fail_history ON "BusinessWebsiteRevision"');
      await db.prisma.$executeRawUnsafe('DROP FUNCTION fail_website_history()');
    }
  });

  it("protects page entry points and exposes the published owner view", async () => {
    // Test import connection: ../../apps/web/app/businesses/[id]/website/page ->
    // apps/web/app/businesses/[id]/website/page.tsx. Loads the real module or its configured mock for this
    // scenario.
    const editor = await import("../../apps/web/app/businesses/[id]/website/page");
    // Test import connection: ../../apps/web/app/website/page -> apps/web/app/website/page.tsx. Loads the real
    // module or its configured mock for this scenario.
    const owner = await import("../../apps/web/app/website/page");
    const params = { params: Promise.resolve({ id: siteId }) };
    const searchParams = { searchParams: Promise.resolve({ businessId: siteId }) };
    session.userId = null;
    await expect(editor.default(params)).rejects.toThrow("REDIRECT:/login");
    await expect(owner.default(searchParams)).rejects.toThrow("REDIRECT:/login");
    session.userId = ids.owner;
    const ownerEditor = await editor.default(params);
    expect(ownerEditor).toBeTruthy();
    expect(await owner.default(searchParams)).toBeTruthy();
    session.userId = ids.otherOwner;
    await expect(owner.default(searchParams)).rejects.toThrow("NOT_FOUND");
    session.userId = ids.developer;
    expect(await editor.default(params)).toBeTruthy();
  });

  it("allows an active owner to publish approved content and styles without changing the template", async () => {
    const input = await values(ids.owner);
    session.userId = ids.owner;
    const result = await action.publishWebsiteAction(siteId, {
      ...input,
      fontFamily: "SERIF",
      textColor: "OCEAN",
      textScale: "LARGE",
      sectionImages: {
        ...input.sectionImages,
        hero: Array.from({ length: 10 }, (_, index) => imageReference("hero", index)),
      },
      additionalSections: [{ heading: "Our story", body: "A new section added by the owner.", images: [imageReference("custom", 0)] }],
    });
    expect(result.publication?.version).toBe(3);
    expect(await domain.getPublicWebsite(siteId)).toMatchObject({
      websiteTemplate: "SALON",
      websiteContent: {
        fontFamily: "SERIF", textColor: "OCEAN", textScale: "LARGE",
        sectionImages: { hero: Array.from({ length: 10 }, (_, index) => imageReference("hero", index)) },
        additionalSections: [{ heading: "Our story", body: "A new section added by the owner.", images: [imageReference("custom", 0)] }],
      },
    });
    expect(await domain.getPublicWebsiteImage(siteId, "hero-9")).toBe(imageReference("hero", 9));
    expect(await domain.getPublicWebsiteImage(siteId, "hero-10")).toBeNull();
    expect(await domain.getPublicWebsiteImage(siteId, "custom-0-0")).toBe(imageReference("custom", 0));
    expect(await domain.getPublicWebsiteImage(siteId, "custom-6-0")).toBeNull();
    const revision = await db.prisma.businessWebsiteRevision.findUniqueOrThrow({
      where: { businessId_version: { businessId: siteId, version: 3 } },
    });
    expect(revision.publishedById).toBe(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...input, version: 3, websiteTemplate: "CONTACT",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await domain.getWebsiteEditor(ids.owner, siteId)).version).toBe(3);
  });

  it("enforces plan image and custom-section limits and owner feature-request allowances", async () => {
    await db.prisma.business.update({ where: { id: siteId }, data: { websitePlan: "FREE" } });
    const freeValues = await values(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...freeValues,
      sectionImages: imageSections(10),
      additionalSections: [],
      logoImage: "",
      heroImage: "",
    })).resolves.toMatchObject({ version: 4 });
    const freeFullValues = await values(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...freeFullValues,
      additionalSections: [{ heading: "Extra", body: "Not available on Free", images: [] }],
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...freeFullValues,
      sectionImages: imageSections(11),
      additionalSections: [],
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(domain.assertWebsiteImageUploadAllowed(ids.owner, siteId, "header"))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect(domain.assertWebsiteImageUploadAllowed(ids.owner, siteId, "custom"))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(domain.submitWebsiteFeatureRequest(ids.owner, siteId, { title: "Free request", description: "Not available" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    await db.prisma.business.update({ where: { id: siteId }, data: { websitePlan: "PLUS" } });
    const plusEditor = await domain.getWebsiteEditor(ids.owner, siteId);
    expect(plusEditor.maxImages).toBe(20);
    expect(plusEditor.canAddCustomSections).toBe(true);
    const plusValues = await values(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...plusValues,
      sectionImages: imageSections(20),
      additionalSections: [{ heading: "Plus section", body: "Available on paid plans.", images: [] }],
      logoImage: "",
      heroImage: "",
    })).resolves.toMatchObject({ version: 5 });
    const fullPlusValues = await values(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...fullPlusValues,
      sectionImages: imageSections(21),
      additionalSections: [],
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(domain.assertWebsiteImageUploadAllowed(ids.owner, siteId, "header"))
      .rejects.toMatchObject({ code: "CONFLICT" });
    for (let index = 0; index < 5; index++) {
      await domain.submitWebsiteFeatureRequest(ids.owner, siteId, { title: `Request ${index + 1}`, description: "A private feature request." });
    }
    await expect(domain.submitWebsiteFeatureRequest(ids.owner, siteId, { title: "Request 6", description: "Over the allowance." }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect(domain.submitWebsiteFeatureRequest(ids.otherOwner, siteId, { title: "Foreign", description: "No access." }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.prisma.websiteFeatureRequest.count({ where: { businessId: siteId } })).toBe(5);

    await db.prisma.business.update({ where: { id: siteId }, data: { websitePlan: "PREMIUM" } });
    const premiumEditor = await domain.getWebsiteEditor(ids.owner, siteId);
    expect(premiumEditor.maxImages).toBe(50);
    expect(premiumEditor.featureRequestLimit).toBeNull();
    const premiumValues = await values(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...premiumValues,
      sectionImages: imageSections(50),
      additionalSections: [],
      logoImage: "",
      heroImage: "",
    })).resolves.toMatchObject({ version: 6 });
    const fullPremiumValues = await values(ids.owner);
    await expect(domain.publishWebsite(ids.owner, siteId, {
      ...fullPremiumValues,
      sectionImages: imageSections(51),
      additionalSections: [],
    })).rejects.toMatchObject({ code: "CONFLICT" });
    for (let index = 0; index < 7; index++) {
      await domain.submitWebsiteFeatureRequest(ids.owner, siteId, { title: `Premium ${index}`, description: "Unlimited in this demo tier." });
    }
    expect(await db.prisma.websiteFeatureRequest.count({ where: { businessId: siteId } })).toBe(12);
    await expect(domain.assertWebsiteImageUploadAllowed(ids.owner, siteId, "custom"))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await db.prisma.business.update({ where: { id: siteId }, data: { websitePlan: null } });
  });
});
