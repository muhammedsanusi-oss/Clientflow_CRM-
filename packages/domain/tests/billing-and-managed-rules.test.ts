import { afterEach, describe, expect, it, vi } from "vitest";

// These tests exercise real pure rules and validation. Any accidental database
// access fails immediately, rather than connecting to local development data.
vi.mock("../src/queries/membership", () => ({
  domainDatabase: new Proxy({}, { get() { throw new Error("Unit tests must not access the database"); } }),
}));
import { addCalendarMonth, DemoSubscriptionAction } from "../src/demo-subscriptions";
import { managedMonth, ManagedServiceMutation } from "../src/managed-service";

afterEach(() => vi.useRealTimers());

describe("calendar-month billing arithmetic", () => {
  it.each([
    ["2027-01-31T10:15:42.123Z", "2027-02-28T10:15:42.123Z"],
    ["2028-01-31T10:15:42.123Z", "2028-02-29T10:15:42.123Z"],
    ["2027-03-31T10:15:42.123Z", "2027-04-30T10:15:42.123Z"],
    ["2027-12-31T23:59:59.999Z", "2028-01-31T23:59:59.999Z"],
    ["2028-02-29T00:00:00.000Z", "2028-03-29T00:00:00.000Z"],
    ["2027-01-15T12:00:00.000Z", "2027-02-15T12:00:00.000Z"],
  ])("renews %s to %s", (start, expected) => {
    const original = new Date(start);
    expect(addCalendarMonth(original)).toEqual(new Date(expected));
    expect(original.toISOString()).toBe(start);
  });
});

describe("managed allowance month", () => {
  it.each([
    ["2027-01-31T23:59:59.999Z", "2027-01", "2027-02-01T00:00:00.000Z"],
    ["2027-02-01T00:00:00.000Z", "2027-02", "2027-03-01T00:00:00.000Z"],
    ["2028-02-29T12:00:00.000Z", "2028-02", "2028-03-01T00:00:00.000Z"],
    ["2027-12-31T23:59:59.999Z", "2027-12", "2028-01-01T00:00:00.000Z"],
    ["2027-02-01T00:30:00+05:30", "2027-01", "2027-02-01T00:00:00.000Z"],
  ])("uses the UTC month for %s", (time, month, reset) => {
    expect(managedMonth(new Date(time))).toEqual({ month, resetsAt: new Date(reset) });
  });

  it("uses server time when no explicit clock is supplied", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-06-15T10:00:00Z"));
    expect(managedMonth()).toEqual({ month: "2027-06", resetsAt: new Date("2027-07-01T00:00:00Z") });
  });
});

const base = { businessId: "business-one", requestId: "request-one", expectedVersion: 0 };
const timeEntry = { ...base, action: "LOG_TIME", minutes: 12, note: "Updated existing opening hours." };
describe("managed-service mutation validation", () => {
  it.each([
    { action: "CREATE", businessId: base.businessId, submissionKey: "00000000-0000-4000-8000-000000000001", title: "Hours", description: "Update existing hours." },
    { ...base, action: "START" },
    { ...base, action: "CANCEL" },
    { ...base, action: "COMPLETE", note: "Published the requested changes." },
    { ...base, action: "DECLINE", note: "New functionality needs a separate quote." },
    timeEntry,
    { ...base, action: "VOID_TIME", entryId: "entry-one", note: "Recorded against the wrong request." },
  ])("accepts the supported $action command", input => {
    expect(ManagedServiceMutation.safeParse(input).success).toBe(true);
  });

  it.each([1, 30])("accepts the included-time boundary of %s minutes", minutes => {
    expect(ManagedServiceMutation.safeParse({ ...timeEntry, minutes }).success).toBe(true);
  });

  it.each([0, -1, 31, 1.5, "12", Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid minutes %s", minutes => {
    expect(ManagedServiceMutation.safeParse({ ...timeEntry, minutes }).success).toBe(false);
  });

  it.each(["COMPLETE", "DECLINE", "LOG_TIME", "VOID_TIME"])("requires a meaningful note for %s", action => {
    expect(ManagedServiceMutation.safeParse({ ...base, action, ...(action === "LOG_TIME" ? { minutes: 1 } : {}), ...(action === "VOID_TIME" ? { entryId: "entry-one" } : {}), note: "  " }).success).toBe(false);
  });

  it.each([-1, 0.5, "0"])("rejects invalid request versions %s", expectedVersion => {
    expect(ManagedServiceMutation.safeParse({ ...base, action: "START", expectedVersion }).success).toBe(false);
  });

  it("requires a real submission UUID and limits request text after trimming", () => {
    const input = { action: "CREATE", businessId: base.businessId, submissionKey: "00000000-0000-4000-8000-000000000001", title: " a ", description: " b " };
    expect(ManagedServiceMutation.parse(input)).toMatchObject({ title: "a", description: "b" });
    for (const invalid of [{ submissionKey: "reuse-anything" }, { title: " " }, { title: "a".repeat(151) }, { description: "b".repeat(4001) }]) {
      expect(ManagedServiceMutation.safeParse({ ...input, ...invalid }).success).toBe(false);
    }
  });

  it.each([
    { actorId: "another-user" }, { month: "2020-01" }, { remaining: 30 }, { status: "COMPLETED" },
  ])("rejects client-supplied authority or accounting fields %j", extra => {
    expect(ManagedServiceMutation.safeParse({ ...timeEntry, ...extra }).success).toBe(false);
  });

  it("requires the time-entry ID for a correction", () => {
    expect(ManagedServiceMutation.safeParse({ ...base, action: "VOID_TIME", note: "Correction" }).success).toBe(false);
  });
});

describe("simulated billing validation", () => {
  const payment = { businessId: "business-one", scenario: "PAY_SUCCESS", plan: "CRM", expectedVersion: 1 };
  it("rejects payment credentials and prices submitted by a client", () => {
    for (const extra of [{ amountCents: 1 }, { currency: "EUR" }, { cardNumber: "test-card" }, { userId: "another-user" }]) {
      expect(DemoSubscriptionAction.safeParse({ ...payment, ...extra }).success).toBe(false);
    }
  });

  it("rejects unsupported service plans and scenarios", () => {
    expect(DemoSubscriptionAction.safeParse({ ...payment, plan: "PREMIUM" }).success).toBe(false);
    expect(DemoSubscriptionAction.safeParse({ ...payment, scenario: "REAL_PAYMENT" }).success).toBe(false);
  });
});
