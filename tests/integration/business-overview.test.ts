import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ userId: "overview-developer" as string | null, getBusiness: vi.fn() }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => mocks.userId }));
vi.mock("../../packages/domain/src/index", () => ({ getProvisionedBusiness: mocks.getBusiness }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../../apps/web/app/businesses/[id]/regenerate-password", () => ({ RegeneratePassword: ({ businessId }: { businessId: string }) => `Generate new setup link: ${businessId}` }));
import BusinessSetupPage from "../../apps/web/app/businesses/[id]/page";
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");

function fixture() {
  return { id: "overview-business", name: "The Corner Chair", description: "A friendly neighborhood barbershop.", websiteTemplate: "BARBERSHOP" as string | null,
    email: "shop@example.test", phone_number: "+1 (212) 555-0142",
    employees: [{ email: "private-owner@example.test", user: { mustChangePassword: false, temporaryExpiresAt: null as Date | null } }] };
}
async function render() { return renderToStaticMarkup(await BusinessSetupPage({ params: Promise.resolve({ id: "overview-business" }) })); }
beforeEach(() => { mocks.userId = "overview-developer"; mocks.getBusiness.mockReset(); mocks.getBusiness.mockResolvedValue(fixture()); });

describe("developer business overview", () => {
  it("separates website tools, public contact, and private owner access with existing destinations", async () => {
    const html = await render();
    expect(mocks.getBusiness).toHaveBeenCalledExactlyOnceWith("overview-developer", "overview-business");
    for (const title of ["Website", "Business contact", "Public details", "Owner access", "Private login details", "Manage this business", "Barbershop template"]) expect(html).toContain(title);
    expect(html).toContain('href="/businesses/overview-business/website"');
    expect(html).toContain('href="/businesses/overview-business/requests"');
    expect(html).toContain('href="/businesses/overview-business/managed-service"');
    expect(html).toContain('aria-label="Open website (opens in a new tab)"');
    expect(html).toContain('href="mailto:shop@example.test"');
    expect(html).toContain('href="tel:+12125550142"');
    expect(html).toContain("bo-status-active");
    expect(html).not.toContain("Generate new setup link");
  });

  it("does not claim that a missing owner is active or show broken website links", async () => {
    const business = fixture(); business.employees = []; business.websiteTemplate = null;
    business.email = ""; business.phone_number = "";
    mocks.getBusiness.mockResolvedValue(business);
    const html = await render();
    expect(html).toContain("Not assigned"); expect(html).toContain("Not provided");
    expect(html).toContain("A website is not configured");
    expect(html).not.toContain("bo-status-active"); expect(html).not.toContain("Generate new setup link");
    expect(html).not.toContain('href="/sites/'); expect(html).not.toContain('href="/businesses/overview-business/website"');
  });

  it.each([false, true])("retains setup recovery for pending owners (expired: %s)", async expired => {
    const business = fixture(); business.employees[0].user.mustChangePassword = true;
    business.employees[0].user.temporaryExpiresAt = new Date(Date.now() + (expired ? -60_000 : 60_000));
    mocks.getBusiness.mockResolvedValue(business);
    const html = await render();
    expect(html).toContain(expired ? "Setup expired" : "Pending setup");
    expect(html).toContain("Generate new setup link: overview-business");
    expect(html).toContain("Generate new setup link"); expect(html).not.toContain("bo-status-active");
  });

  it("redirects signed-out users before loading business details", async () => {
    mocks.userId = null;
    await expect(render()).rejects.toThrow("REDIRECT:/login"); expect(mocks.getBusiness).not.toHaveBeenCalled();
  });

  it("keeps unknown and foreign resources on the not-found path", async () => {
    mocks.getBusiness.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });
});
