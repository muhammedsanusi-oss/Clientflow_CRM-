import { describe, expect, it, vi, afterEach } from "vitest";
import { callbackInstant, CustomCrmRequest } from "../src/callback-request";

afterEach(() => { vi.useRealTimers(); });
describe("tailored signup callback choices", () => {
  const valid = { name: "Owner", email: "OWNER@example.test", phone: "+1 (212) 555-0100", description: "A website with custom inventory tracking.", callbackDate: "2027-07-01", callbackTime: "10:30", callbackTimeZone: "America/New_York" };
  it("converts explicit zones including half-hour offsets", () => {
    expect(callbackInstant("2027-07-01", "10:30", "America/New_York")).toEqual(new Date("2027-07-01T14:30:00Z"));
    expect(callbackInstant("2027-01-01", "10:30", "Asia/Kolkata")).toEqual(new Date("2027-01-01T05:00:00Z"));
  });
  it.each([
    ["2027-03-14", "02:30", "America/New_York"],
    ["2027-11-07", "01:30", "America/New_York"],
    ["2027-02-30", "10:00", "UTC"],
    ["2027-07-01", "10:30", "invalid-zone"],
  ])("rejects nonexistent, ambiguous, or invalid choices %s %s %s", (date, time, zone) => {
    expect(callbackInstant(date, time, zone)).toBeNull();
    expect(CustomCrmRequest.safeParse({ ...valid, callbackDate: date, callbackTime: time, callbackTimeZone: zone }).success).toBe(false);
  });
  it("requires contact fields and future time, normalizes fallback email", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    expect(CustomCrmRequest.parse(valid).email).toBe("owner@example.test");
    for (const invalid of [{ phone: "" }, { phone: "abc1234567" }, { email: "invalid" }, { callbackTime: "25:00" }, { callbackDate: "2026-12-31" }]) {
      expect(CustomCrmRequest.safeParse({ ...valid, ...invalid }).success).toBe(false);
    }
  });
});
