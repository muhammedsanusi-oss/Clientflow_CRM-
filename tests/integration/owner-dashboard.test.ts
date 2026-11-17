import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoPlan } from "../../packages/domain/src/subscription-access";
type Business = { id: string; name: string; description: string; websiteTemplate: "BARBERSHOP" | null; demoSubscription: { plan: DemoPlan; status: string; periodEnd: Date | null } | null };
const state = vi.hoisted(() => ({ userId: "owner-user" as string | null, developer: false, businesses: [] as Business[], reads: vi.fn() }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => state.userId }));
vi.mock("../../packages/domain/src/index", () => ({ getUser: async () => ({ isDeveloper: state.developer }), listOwnerDashboardBusinesses: async (...args: unknown[]) => { state.reads(...args); return state.businesses; } }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
import OwnerDashboardPage from "../../apps/web/app/owner/page";
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
const render = async (businessId?: string | string[]) => renderToStaticMarkup(await OwnerDashboardPage({ searchParams: Promise.resolve({ businessId }) }));
beforeEach(() => {
  state.userId = "owner-user"; state.developer = false; state.reads.mockReset();
  state.businesses = [{ id: "selected-business", name: "Corner Chair", description: "A local shop", websiteTemplate: "BARBERSHOP", demoSubscription: { plan: "CRM", status: "ACTIVE", periodEnd: new Date(Date.now() + 86400000) } }];
});
describe("business owner dashboard", () => {
  it("groups existing tools and keeps every link scoped to the selected owner business", async () => {
    const html = await render();
    expect(state.reads).toHaveBeenCalledExactlyOnceWith("owner-user");
    for (const label of ["Business dashboard", "Website", "Customers", "Scheduling", "Account &amp; support", "Website inquiries", "Customer notes", "Appointment calendar", "Bookable services", "Business hours &amp; staff"]) expect(html).toContain(label);
    for (const href of ["/customers?businessId=selected-business", "/calendar?businessId=selected-business", "/subscription?businessId=selected-business", "/businesses/selected-business/website"]) expect(html).toContain(`href="${href}"`);
    expect(html).not.toContain("Your dashboard is still available");
  });
  it("keeps canceled owners on the dashboard while hiding protected tools", async () => {
    state.businesses[0].demoSubscription!.status = "CANCELED";
    const html = await render();
    expect(html).toContain("Canceled"); expect(html).toContain("Your dashboard is still available");
    expect(html).toContain('href="/website?businessId=selected-business"');
    expect(html).toContain('href="/subscription?businessId=selected-business"');
    for (const href of ["/calendar?", "/customers?", "/notes?", "/inquiries?", "/businesses/selected-business/website"]) expect(html).not.toContain(`href="${href}`);
  });
  it("shows website-only access for Standard and managed support for Managed", async () => {
    state.businesses[0].demoSubscription!.plan = "STANDARD";
    let html = await render();
    expect(html).toContain("Edit website"); expect(html).not.toContain('href="/calendar?');
    state.businesses[0].demoSubscription!.plan = "MANAGED";
    html = await render(); expect(html).toContain('href="/managed-service?businessId=selected-business"');
  });
  it("preserves legacy access and explains missing website configuration", async () => {
    state.businesses[0].demoSubscription = null; state.businesses[0].websiteTemplate = null;
    const html = await render();
    expect(html).toContain("Legacy access"); expect(html).toContain("Your website is not configured yet");
    expect(html).toContain('href="/calendar?businessId=selected-business"'); expect(html).not.toContain('href="/website?');
  });
  it("selects an authorized business explicitly and rejects foreign or repeated IDs", async () => {
    state.businesses.push({ ...state.businesses[0], id: "second-business", name: "Second business" });
    const html = await render("second-business");
    expect(html).toContain("Choose your business"); expect(html).toContain('href="/calendar?businessId=second-business"');
    expect(html).not.toContain('href="/calendar?businessId=selected-business"');
    await expect(render("foreign-business")).rejects.toThrow("NOT_FOUND");
    await expect(render(["selected-business", "second-business"])).rejects.toThrow("NOT_FOUND");
  });
  it("has an empty state without a business and preserves role boundaries", async () => {
    state.businesses = []; expect(await render()).toContain("No business workspace is linked");
    state.developer = true; await expect(render()).rejects.toThrow("REDIRECT:/");
    state.userId = null; await expect(render()).rejects.toThrow("REDIRECT:/login");
  });
});
