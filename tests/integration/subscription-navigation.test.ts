import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ developer: false, plan: "CRM", status: "ACTIVE", template: "CONTACT" as string | null }));
vi.mock("../../packages/auth/src/index", () => ({ currentUserId: async () => "navigation-user" }));
vi.mock("../../packages/domain/src/queries/users", () => ({ getUser: async () => ({ isDeveloper: state.developer }) }));
vi.mock("../../packages/domain/src/demo-subscriptions", () => ({
  listSubscriptionBusinesses: async () => [{ id: "other-business", name: "Other business" }, { id: "selected-business", name: "Selected business" }],
  getDemoSubscription: async (_user: string, id: string) => ({ id, name: "Selected business", websiteTemplate: state.template,
    demoSubscription: { plan: state.plan, status: state.status, periodEnd: new Date(Date.now() + 86400000), version: 1 }, demoSubscriptionEvents: [] }),
}));
vi.mock("../../packages/domain/src/managed-service", () => ({ getManagedService: async () => null }));
vi.mock("../../apps/web/app/subscription/demo-controls", () => ({ DemoControls: () => null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
import SubscriptionPage from "../../apps/web/app/subscription/page";
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
const render = async () => renderToStaticMarkup(await SubscriptionPage({ searchParams: Promise.resolve({ businessId: "selected-business" }) }));
beforeEach(() => { state.developer = false; state.plan = "CRM"; state.status = "ACTIVE"; state.template = "CONTACT"; });
describe("subscription return navigation", () => {
  it.each(["CRM", "MANAGED"])("returns %s owners to the selected business dashboard", async plan => {
    state.plan = plan;
    expect(await render()).toMatch(/href="\/owner\?businessId=selected-business"[^>]*>Back to owner dashboard/);
  });
  it("returns Standard owners to their selected website workspace", async () => {
    state.plan = "STANDARD";
    expect(await render()).toMatch(/href="\/owner\?businessId=selected-business"[^>]*>Back to owner dashboard/);
  });
  it("keeps developers in their business detail workspace", async () => {
    state.developer = true;
    const html = await render();
    expect(html).toMatch(/href="\/businesses\/selected-business"[^>]*>Back to business details/);
    expect(html).not.toMatch(/href="\/owner"/);
  });
  it("keeps inactive owners on their dashboard", async () => {
    state.status = "CANCELED";
    expect(await render()).toMatch(/href="\/owner\?businessId=selected-business"[^>]*>Back to owner dashboard/);
  });
  it("explains unavailable workspaces rather than offering a dead return action", async () => {
    state.status = "PENDING"; state.template = null;
    const html = await render();
    expect(html).toMatch(/href="\/owner\?businessId=selected-business"[^>]*>Back to owner dashboard/);
  });
});
