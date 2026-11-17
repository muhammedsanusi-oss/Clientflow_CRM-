import { describe, expect, it } from "vitest";
import {
  HexColor, WebsiteColorsSchema, WebsiteColorSwatchesSchema, normalizeHex,
  resolvedWebsiteColors, contrastRatio, hexToHsv, hsvToHex,
} from "../src/website-colors";
import { WebsiteContentSchema, defaultWebsiteContent } from "../src/website-content";
import { PublishWebsite } from "../src/website-editing";

describe("website colors", () => {
  it.each([["#f80", "#FF8800"], ["abc", "#AABBCC"], [" 123456 ", "#123456"], ["#000000", "#000000"], ["ffffff", "#FFFFFF"]])("normalizes %s", (input, expected) => {
    expect(HexColor.parse(input)).toBe(expected);
  });
  it.each(["", "#12", "#12345", "#1234567", "#12345678", "red", "#ZZZZZZ", "rgb(0,0,0)", "url(javascript:bad)", "##ffffff"]) ("rejects unsupported input %s", input => {
    expect(normalizeHex(input)).toBeNull();
    expect(HexColor.safeParse(input).success).toBe(false);
  });
  it("validates all roles and rejects CSS, unknown roles, oversized palettes", () => {
    const colors = { page: "000", section: "#fff", heading: "ABC", body: "123456", link: "f80", button: "#AA66FF", buttonText: "fff" };
    expect(WebsiteColorsSchema.parse(colors)).toEqual({ page: "#000000", section: "#FFFFFF", heading: "#AABBCC", body: "#123456", link: "#FF8800", button: "#AA66FF", buttonText: "#FFFFFF" });
    expect(WebsiteColorsSchema.safeParse({ body: "red;display:none" }).success).toBe(false);
    expect(WebsiteColorsSchema.safeParse({ backgroundImage: "url(x)" }).success).toBe(false);
    expect(WebsiteColorSwatchesSchema.parse(["#fff", "FFFFFF", "123456"])).toEqual(["#FFFFFF", "#123456"]);
    const twelve = Array.from({ length: 12 }, (_, i) => i.toString(16).padStart(6, "0"));
    expect(WebsiteColorSwatchesSchema.parse(twelve)).toHaveLength(12);
    expect(WebsiteColorSwatchesSchema.safeParse([...twelve, "F80"]).success).toBe(false);
  });
  it("gives legacy content empty overrides and no swatches", () => {
    const { colors, colorSwatches, ...old } = defaultWebsiteContent("BARBERSHOP");
    expect(WebsiteContentSchema.parse(old)).toMatchObject({ colors: {}, colorSwatches: [] });
    const input = { ...old, name: "Test", description: "Description", websiteTemplate: "BARBERSHOP", email: "a@example.test", phone_number: "2125550142", publicAddress: "", openingHours: "", version: 0, logoImage: "", heroImage: "" };
    expect(PublishWebsite.parse(input)).toMatchObject({ colors: {}, colorSwatches: [] });
    expect(PublishWebsite.safeParse({ ...input, colors: { button: "bogus" } }).success).toBe(false);
  });
  it("preserves legacy dark text and resolves only explicit overrides", () => {
    expect(resolvedWebsiteColors("BARBERSHOP", "OCEAN", {})).toMatchObject({ heading: "#93C5FD", body: "#93C5FD", button: "#93C5FD", page: "#151C1B" });
    const base = resolvedWebsiteColors("SALON", "PLUM", {});
    expect(resolvedWebsiteColors("SALON", "PLUM", { button: "#001122" })).toEqual({ ...base, button: "#001122" });
  });
  it("calculates contrast without blocking low-contrast selections", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#2563EB", "#FFFFFF")).toBeCloseTo(5.17, 1);
    expect(WebsiteColorsSchema.parse({ body: "#fff", page: "#fff" })).toEqual({ body: "#FFFFFF", page: "#FFFFFF" });
  });
  it("round-trips the picker through every RGB channel and hue sector", () => {
    for (const color of ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#3158C9", "#808080", "#010203", "#F0B827"]) {
      expect(hsvToHex(...hexToHsv(color))).toBe(color);
    }
    for (let value = 0; value < 256; value++) {
      const channel = value.toString(16).padStart(2, "0").toUpperCase();
      for (const color of [`#${channel}00FF`, `#00${channel}FF`, `#FF00${channel}`]) expect(hsvToHex(...hexToHsv(color))).toBe(color);
    }
  });
});
