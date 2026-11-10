/*
 * Code guide: tests/integration/website-templates.test.ts
 * Automated regression tests for reusable website templates and owner inquiries. Assertions document expected
 * behavior and failure cases; inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather
 * than changing the running local project data.
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
 * Import connection: ../../packages/domain/src/website-templates -> packages/domain/src/website-templates.ts.
 * sampleBusinessDetails: Builds fictional form values for the selected template, including a unique test
 * owner email. Filling these values does not save or publish a business.
 * WEBSITE_TEMPLATE_KEYS: Allowlist of the four accepted website template keys.
 */
import { sampleBusinessDetails, WEBSITE_TEMPLATE_KEYS } from "../../packages/domain/src/website-templates";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => session.userId }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
let route: typeof import("../../apps/web/app/api/sites/[businessId]/contact/route");
let developerId: string;
const sites: Array<{ id: string; ownerId: string; template: string; ownerEmail: string }> = [];
const context = (id: string) => ({ params: Promise.resolve({ businessId: id }) });
const contact = { name: "Sam Visitor", email: "visitor@example.test", phone: "2125550199", message: "Hello, I would like to learn about your business.", website: "" };
const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/sites/test/contact", { method: "POST", headers: { origin, "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  // Test import connection: ../../packages/db/src/index -> packages/db/src/index.ts. Loads the real module or
  // its configured mock for this scenario.
  db = await import("../../packages/db/src/index");
  // Test import connection: ../../packages/domain/src/index -> packages/domain/src/index.ts. Loads the real
  // module or its configured mock for this scenario.
  domain = await import("../../packages/domain/src/index");
  // Test import connection: ../../apps/web/app/api/sites/[businessId]/contact/route ->
  // apps/web/app/api/sites/[businessId]/contact/route.ts. Loads the real module or its configured mock for this
  // scenario.
  route = await import("../../apps/web/app/api/sites/[businessId]/contact/route");
  developerId = (await db.prisma.user.create({ data: { email: "template-developer@example.test", isDeveloper: true } })).id;
}, 30000);
afterAll(async () => { await db?.prisma.$disconnect(); });

describe.sequential("reusable website templates and owner inquiries", () => {
  it("creates all four templates through the existing business action with saved public details", async () => {
    session.userId = developerId;
    // Test import connection: ../../apps/web/app/businesses/new/actions ->
    // apps/web/app/businesses/new/actions.ts. Loads the real module or its configured mock for this scenario.
    const { addBusinessAction } = await import("../../apps/web/app/businesses/new/actions");
    for (const template of WEBSITE_TEMPLATE_KEYS) {
      const details = sampleBusinessDetails(template, "integration");
      const form = new FormData(); for (const [key,value] of Object.entries(details)) form.set(key,value);
      const state = await addBusinessAction({},form);
      expect(state.error).toBeUndefined(); expect(state.receipt?.websiteUrl).toBe(`/sites/${state.receipt?.businessId}`);
      const id = state.receipt!.businessId;
      const site = await domain.getPublicWebsite(id);
      expect(site).toMatchObject({ name: details.name, websiteTemplate: template, publicAddress: details.public_address, openingHours: details.opening_hours });
      const ownerId = (await db.prisma.user.findUniqueOrThrow({ where: { email: details.owner_email } })).id;
      sites.push({ id, ownerId, template, ownerEmail: details.owner_email });
      // Test import connection: ../../apps/web/app/sites/[businessId]/page ->
      // apps/web/app/sites/[businessId]/page.tsx. Loads the real module or its configured mock for this scenario.
      const page = await import("../../apps/web/app/sites/[businessId]/page");
      expect(await page.default(context(id))).toBeTruthy();
    }
  },15000);
  it("returns only the explicit public projection and does not publish legacy business records", async () => {
    const site = await domain.getPublicWebsite(sites[0].id);
    expect(Object.keys(site!).sort()).toEqual(["id","name","description","websiteTemplate","email","phone_number","publicAddress","openingHours","websiteContent"].sort());
    expect(JSON.stringify(site)).not.toContain(sites[0].ownerEmail);
    const legacy = await db.prisma.business.create({ data: { name: "Private legacy", business_type: "OTHER", email: "private@example.test", phone_number: "2125550123" } });
    expect(await domain.getPublicWebsite(legacy.id)).toBeNull();
    expect((await route.POST(request(contact),context(legacy.id))).status).toBe(404);
    // Test import connection: ../../apps/web/app/sites/[businessId]/page ->
    // apps/web/app/sites/[businessId]/page.tsx. Loads the real module or its configured mock for this scenario.
    const page = await import("../../apps/web/app/sites/[businessId]/page");
    await expect(page.default(context(legacy.id))).rejects.toThrow("NOT_FOUND");
  });
  it("delivers public messages to the correct owner's private inbox only", async () => {
    session.userId = null;
    for (const site of sites) expect((await route.POST(request({ ...contact, message: `A message for the ${site.template} business.` }),context(site.id))).status).toBe(200);
    const inbox = await domain.listOwnerInquiries(sites[0].ownerId,sites[0].id);
    expect(inbox.inquiries).toHaveLength(1); expect(inbox.inquiries[0]).toMatchObject({ name: contact.name, message: "A message for the BAKERY business." });
    await expect(domain.listOwnerInquiries(sites[1].ownerId,sites[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(domain.listOwnerInquiries(developerId,sites[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Test import connection: ../../apps/web/app/inquiries/page -> apps/web/app/inquiries/page.tsx. Loads the
    // real module or its configured mock for this scenario.
    const page = await import("../../apps/web/app/inquiries/page");
    await expect(page.default({searchParams:Promise.resolve({businessId:sites[0].id})})).rejects.toThrow("REDIRECT:/login");
    session.userId=sites[0].ownerId;
    expect(await page.default({searchParams:Promise.resolve({businessId:sites[0].id})})).toBeTruthy();
    session.userId=sites[1].ownerId;
    await expect(page.default({searchParams:Promise.resolve({businessId:sites[0].id})})).rejects.toThrow("NOT_FOUND");
  });
  it("rejects invalid input, recipient reassignment, oversized bodies, unknown sites and cross-origin requests", async () => {
    const count=await db.prisma.websiteInquiry.count();
    for (const body of [{...contact,email:"invalid"},{...contact,message:"short"},{...contact,businessId:sites[1].id},{...contact,ownerId:sites[1].ownerId}]) {
      expect((await route.POST(request(body),context(sites[0].id))).status).toBe(400);
    }
    expect((await route.POST(request("{"),context(sites[0].id))).status).toBe(400);
    expect((await route.POST(request({...contact,message:"x".repeat(9000)}),context(sites[0].id))).status).toBe(413);
    expect((await route.POST(request(contact,"https://foreign.example"),context(sites[0].id))).status).toBe(403);
    expect((await route.POST(request(contact),context("unknown"))).status).toBe(404);
    expect((await route.POST(request({...contact,website:"spam"}),context(sites[0].id))).status).toBe(200);
    expect(await db.prisma.websiteInquiry.count()).toBe(count);
  });
  it("limits persisted messages per business and keeps other businesses independent", async () => {
    const id=sites[0].id;
    for(let i=0;i<9;i++) expect((await route.POST(request(contact),context(id))).status).toBe(200);
    const blocked=await route.POST(request(contact),context(id));
    expect(blocked.status).toBe(429); expect(blocked.headers.get("retry-after")).toBe("900");
    expect(await db.prisma.websiteInquiry.count({where:{businessId:id}})).toBe(10);
    expect((await route.POST(request(contact),context(sites[1].id))).status).toBe(200);
    await db.prisma.authThrottle.updateMany({data:{windowStart:new Date(0)}});
    expect((await route.POST(request(contact),context(id))).status).toBe(200);
  });
  it("validates template keys and rolls back the entire business when provisioning fails", async () => {
    const count=await db.prisma.business.count();
    const invalid={...sampleBusinessDetails("CONTACT","invalid"),website_template:"UNSUPPORTED"};
    expect(domain.ProvisionBusiness.safeParse(invalid).success).toBe(false);
    const duplicate=sampleBusinessDetails("BAKERY","integration");
    await expect(domain.provisionBusiness(developerId,duplicate)).rejects.toMatchObject({code:"CONFLICT"});
    expect(await db.prisma.business.count()).toBe(count);
  });
});
