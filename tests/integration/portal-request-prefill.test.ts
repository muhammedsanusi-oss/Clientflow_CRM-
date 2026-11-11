import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ userId: "prefill-developer" as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => identity.userId }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
let page: typeof import("../../apps/web/app/businesses/new/page");
const context = (requestId?: string | string[]) => ({ searchParams: Promise.resolve({ requestId }) });

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index"); domain = await import("../../packages/domain/src/index");
  page = await import("../../apps/web/app/businesses/new/page");
  await db.prisma.user.createMany({ data: [{ id: "prefill-developer", isDeveloper: true }, { id: "prefill-owner" }] });
  await db.prisma.customCrmRequest.createMany({ data: [
    { id: "prefill-request", name: "Alex Morgan Lee", email: "private-owner@example.test", phone: "+1 (212) 555-0199",
      businessName: "Tailored Studio", description: "Private discussion about a tailored business portal." },
    { id: "prefill-single-name", name: "Alex", email: "single@example.test", description: "An older request without a business name or phone." },
  ] });
}, 30_000);
afterAll(async () => { await db?.prisma.$disconnect(); });

describe.sequential("set up portal from a tailored request", () => {
  it("prefills editable private owner details while keeping public contact fields separate", async () => {
    const usersBefore = await db.prisma.user.count();
    const businessesBefore = await db.prisma.business.count();
    expect(await domain.getCustomCrmRequestForPortalSetup("prefill-developer", "prefill-request")).toMatchObject({
      initialValues: { name: "Tailored Studio", first_name: "Alex", last_name: "Morgan Lee", owner_email: "private-owner@example.test" },
      contactPhone: "+1 (212) 555-0199",
    });
    const html = renderToStaticMarkup(await page.default(context("prefill-request")));
    expect(html).toContain("Set up client portal");
    expect(html).toContain('name="name"'); expect(html).toContain('value="Tailored Studio"');
    expect(html).toContain('value="Alex"'); expect(html).toContain('value="Morgan Lee"');
    expect(html).toMatch(/name="owner_email"[^>]*value="private-owner@example.test"/);
    expect(html).toMatch(/name="email"[^>]*value=""/);
    expect(html).toMatch(/name="phone_number"[^>]*value=""/);
    expect(html).toContain("Use contact phone on website");
    expect(await db.prisma.user.count()).toBe(usersBefore);
    expect(await db.prisma.business.count()).toBe(businessesBefore);
    expect(await db.prisma.customCrmRequest.count()).toBe(2);
    const inbox = await import("../../apps/web/app/custom-crm-requests/page");
    const inboxHtml = renderToStaticMarkup(await inbox.default());
    expect(inboxHtml).toContain('href="/businesses/new?requestId=prefill-request"');
    expect(inboxHtml).toContain('href="/businesses/new?requestId=prefill-single-name"');
    expect(inboxHtml).toContain(">Set up portal</a>");
  });

  it("supports older and single-name requests without inventing missing details", async () => {
    expect(await domain.getCustomCrmRequestForPortalSetup("prefill-developer", "prefill-single-name")).toMatchObject({
      initialValues: { name: "", first_name: "Alex", last_name: "", owner_email: "single@example.test" }, contactPhone: null,
    });
    const html = renderToStaticMarkup(await page.default(context()));
    expect(html).not.toContain("Starting from a tailored request");
    expect(html).toMatch(/name="owner_email"[^>]*value=""/);
  });

  it("rejects missing requests and denies prospect data to owners and signed-out visitors", async () => {
    await expect(domain.getCustomCrmRequestForPortalSetup("prefill-owner", "prefill-request")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(page.default(context("missing-request"))).rejects.toThrow("NOT_FOUND");
    await expect(page.default(context(["prefill-request", "other"]))).rejects.toThrow("NOT_FOUND");
    identity.userId = "prefill-owner";
    await expect(page.default(context("prefill-request"))).rejects.toThrow("NOT_FOUND");
    identity.userId = null;
    await expect(page.default(context("prefill-request"))).rejects.toThrow("REDIRECT:/login");
  });
});
