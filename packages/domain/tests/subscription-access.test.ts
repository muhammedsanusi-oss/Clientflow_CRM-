import { afterEach, describe, expect, it, vi } from "vitest";
import { hasCrmAccess, hasWebsiteAccess, ownerWorkspaceHref } from "../src/subscription-access";

const now = new Date("2027-01-15T12:00:00.000Z");
const future = new Date("2027-02-15T12:00:00.000Z");
afterEach(() => vi.useRealTimers());

describe("subscription access", () => {
  it.each([
    ["STANDARD", false], ["CRM", true], ["MANAGED", true],
  ] as const)("grants active %s website access and the appropriate CRM access", (plan, crm) => {
    const subscription = { plan, status: "ACTIVE", periodEnd: future };
    expect(hasWebsiteAccess(subscription, now)).toBe(true);
    expect(hasCrmAccess(subscription, now)).toBe(crm);
  });

  it.each(["PENDING", "PAST_DUE", "CANCELED", "UNKNOWN"])("denies %s even with a future paid-through date", status => {
    for (const plan of ["STANDARD", "CRM", "MANAGED"] as const) {
      const subscription = { plan, status, periodEnd: future };
      expect(hasWebsiteAccess(subscription, now)).toBe(false);
      expect(hasCrmAccess(subscription, now)).toBe(false);
    }
  });

  it("requires a paid-through date for an active subscription", () => {
    const subscription = { plan: "MANAGED" as const, status: "ACTIVE", periodEnd: null };
    expect(hasWebsiteAccess(subscription, now)).toBe(false);
    expect(hasCrmAccess(subscription, now)).toBe(false);
  });

  it.each([
    ["one millisecond before expiry", "2027-01-15T12:00:00.001Z", true],
    ["at expiry", "2027-01-15T12:00:00.000Z", false],
    ["after expiry", "2027-01-15T11:59:59.999Z", false],
  ] as const)("checks the exact boundary %s", (_label, end, allowed) => {
    const subscription = { plan: "CRM" as const, status: "ACTIVE", periodEnd: new Date(end) };
    expect(hasWebsiteAccess(subscription, now)).toBe(allowed);
    expect(hasCrmAccess(subscription, now)).toBe(allowed);
  });

  it.each([null, undefined])("preserves legacy access for a missing subscription (%s)", subscription => {
    expect(hasWebsiteAccess(subscription, now)).toBe(true);
    expect(hasCrmAccess(subscription, now)).toBe(true);
  });
});

describe("owner workspace destination", () => {
  it.each([
    ["STANDARD", "ACTIVE", future, "/businesses/business%2Fone/website"],
    ["CRM", "ACTIVE", future, "/calendar?businessId=business%2Fone"],
    ["MANAGED", "ACTIVE", future, "/calendar?businessId=business%2Fone"],
    ["STANDARD", "PENDING", null, "/subscription?businessId=business%2Fone"],
    ["MANAGED", "CANCELED", future, "/subscription?businessId=business%2Fone"],
    ["CRM", "ACTIVE", now, "/subscription?businessId=business%2Fone"],
  ] as const)("routes %s / %s by actual access", (plan, status, periodEnd, expected) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    expect(ownerWorkspaceHref({ id: "business/one", demoSubscription: { plan, status, periodEnd } })).toBe(expected);
  });

  it("keeps the legacy calendar destination and safely encodes the business ID", () => {
    expect(ownerWorkspaceHref({ id: "business & other" })).toBe("/calendar?businessId=business%20%26%20other");
  });
});
