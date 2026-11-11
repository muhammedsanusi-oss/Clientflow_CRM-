import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ userId: "directory-developer" }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => identity.userId }));
vi.mock("../../apps/web/components/developer-notification-bell", () => ({ DeveloperNotificationBell: () => null }));
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
let db: typeof import("../../packages/db/src/index");
let domain: typeof import("../../packages/domain/src/index");
let home: typeof import("../../apps/web/app/page");
let signupId: string;
const hidden = ["directory-example", "directory-placeholder", "directory-pending-placeholder"];

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  vi.stubEnv("NODE_ENV", "development");
  db = await import("../../packages/db/src/index"); domain = await import("../../packages/domain/src/index");
  home = await import("../../apps/web/app/page");
  await db.prisma.user.createMany({ data: [
    { id: identity.userId, isDeveloper: true, email: "directory-developer@example.test" },
    { id: "directory-foreign-developer", isDeveloper: true },
    { id: "directory-pending-owner", mustChangePassword: true, temporaryExpiresAt: new Date(Date.now() + 86400000) },
    { id: "directory-expired-owner", mustChangePassword: true, temporaryExpiresAt: new Date(0) },
  ] });
  const signup = await domain.createLocalOwnerSignup({
    name: "Signed-up website", first_name: "Signup", last_name: "Owner", owner_email: "directory-owner@example.test",
    password: "a private signup password", password_confirmation: "a private signup password",
    email: "directory-business@example.test", phone_number: "2125550100", description: "An owner's Clientflow website",
    business_type: "OTHER", website_template: "CONTACT", website_plan: "FREE",
    billing_street: "1 Example Street", billing_city: "Example City", billing_state: "NY", billing_zip: "10001",
  });
  signupId = signup.business.id;
  for (const [id, ownerId, template, developerId] of [
    [hidden[0], signup.ownerId, null, identity.userId],
    [hidden[1], signup.ownerId, null, identity.userId],
    [hidden[2], "directory-pending-owner", null, identity.userId],
    ["directory-pending-site", "directory-pending-owner", "SALON", identity.userId],
    ["directory-expired-site", "directory-expired-owner", "CONTACT", identity.userId],
    ["directory-unassigned-site", null, "CONTACT", identity.userId],
    ["directory-foreign-site", signup.ownerId, "BAKERY", "directory-foreign-developer"],
  ] as const) {
    await db.prisma.business.create({ data: {
      id, name: id, business_type: "OTHER", email: `${id}@example.test`, phone_number: "2125550100", websiteTemplate: template,
      developerAccess: { create: { developerId } },
      ...(ownerId ? { employees: { create: { user_id: ownerId, role: "OWNER", first_name: "Test", last_name: "Owner",
        email: `${id}@example.test`, phone_number: "2125550100", hire_date: new Date() } } } : {}),
    } });
  }
  await db.prisma.customer.create({ data: { business_id: hidden[0], first_name: "Keep", last_name: "Customer", email: "keep@example.test",
    phone_number: "2125550199", address: "Example Street", preferred_contact_method: "EMAIL" } });
}, 30_000);
afterAll(async () => { await db?.prisma.$disconnect(); vi.unstubAllEnvs(); });

describe.sequential("website-backed developer directory", () => {
  it("lists signup websites and granted configured sites, excluding examples without websites", async () => {
    const rows = await domain.listProvisionedBusinesses(identity.userId);
    expect(rows.map(row => row.id).sort()).toEqual([
      signupId, "directory-pending-site", "directory-expired-site", "directory-unassigned-site",
    ].sort());
    const html = renderToStaticMarkup(await home.default());
    for (const id of [...hidden, "directory-foreign-site"]) expect(html).not.toContain(id);
    expect(html).toMatch(/4 total/);
    expect(html).toContain("Signed-up website");
    expect(html).toContain("Demo subscription: Standard website");
    expect(html).toContain("$39/month");
    expect(html).toContain("PENDING");
    expect(html).toContain("Set up client portal");
    for (const row of rows) expect(html).toContain(`href="/sites/${row.id}"`);
  });

  it("labels owner access independently and never treats an absent owner as active", async () => {
    const html = renderToStaticMarkup(await home.default());
    for (const status of ["Active", "Pending password setup", "Password setup expired", "Not assigned"]) {
      expect(html).toContain(`Owner access: ${status}`);
    }
    expect(html).not.toMatch(/<p>Active<\/p>/);
  });

  it("keeps excluded businesses, CRM data, and authorized detail access intact", async () => {
    await domain.listProvisionedBusinesses(identity.userId);
    expect(await db.prisma.business.count({ where: { id: { in: hidden } } })).toBe(3);
    expect(await db.prisma.customer.count({ where: { business_id: hidden[0] } })).toBe(1);
    expect(await domain.getProvisionedBusiness(identity.userId, hidden[0])).toMatchObject({ id: hidden[0] });
    await expect(domain.getProvisionedBusiness(identity.userId, "directory-foreign-site")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("shows the website-specific empty state when only placeholders are granted", async () => {
    await db.prisma.user.create({ data: { id: "directory-empty-developer", isDeveloper: true } });
    await db.prisma.developerBusinessAccess.create({ data: { developerId: "directory-empty-developer", businessId: hidden[0] } });
    identity.userId = "directory-empty-developer";
    expect(await domain.listProvisionedBusinesses(identity.userId)).toEqual([]);
    const html = renderToStaticMarkup(await home.default());
    expect(html).toContain("No businesses with a Clientflow website");
    expect(html).toContain("0 total");
    expect(html).toContain('href="/businesses/new"');
    expect(html).not.toContain(hidden[0]);
  });
});
