import { describe, expect, it } from "vitest";
import { changeRichTextCase, formatRichText, plainRichText, richTextValue, RichTextSchema, WebsiteRichTextSchema, WebsiteSectionStylesSchema } from "../src/website-rich-text";
import { defaultWebsiteContent, WebsiteContentSchema } from "../src/website-content";
import { PublishWebsite } from "../src/website-editing";

const input = () => ({ ...defaultWebsiteContent("CONTACT"), name: "Business", description: "A business", websiteTemplate: "CONTACT" as const, email: "public@example.test", phone_number: "2125550142", publicAddress: "", openingHours: "", version: 0, logoImage: "", heroImage: "" });
describe("structured website text", () => {
  it("formats a substring without touching neighboring text and merges adjacent runs", () => {
    const value = formatRichText(plainRichText("Hello world"), 6, 11, { bold: true, color: "#123456" });
    expect(value.runs).toEqual([{ text: "Hello ", marks: {} }, { text: "world", marks: { bold: true, color: "#123456" } }]);
    expect(richTextValue(value)).toBe("Hello world");
    expect(formatRichText(value, 6, 11, {}, true)).toEqual(plainRichText("Hello world"));
  });
  it("formats the whole focused field when the selection is collapsed", () => {
    expect(formatRichText(plainRichText("Heading"), 2, 2, { font: "Georgia", size: 48 })).toEqual({ runs: [{ text: "Heading", marks: { font: "Georgia", size: 48 } }] });
  });
  it("changes letter case only in the selected range and retains formatting", () => {
    const value = { runs: [{ text: "HELLO ", marks: { bold: true } }, { text: "world", marks: { italic: true } }] };
    expect(richTextValue(changeRichTextCase(value, 6, 11, "upper"))).toBe("HELLO WORLD");
    expect(changeRichTextCase(value, 0, 0, "title").runs).toEqual([{ text: "Hello ", marks: { bold: true } }, { text: "World", marks: { italic: true } }]);
    expect(richTextValue(changeRichTextCase(value, 0, 5, "lower"))).toBe("hello world");
  });
  it("splits a range across differently formatted runs without losing outside marks", () => {
    const value = { runs: [{ text: "Alpha", marks: { bold: true } }, { text: "Beta", marks: { italic: true } }] };
    expect(formatRichText(value, 3, 7, { underline: true }).runs).toEqual([
      { text: "Alp", marks: { bold: true } }, { text: "ha", marks: { bold: true, underline: true } },
      { text: "Be", marks: { italic: true, underline: true } }, { text: "ta", marks: { italic: true } },
    ]);
  });
  it("accepts the font bounds and Word-style marks as structured values", () => {
    expect(RichTextSchema.parse({ align: "center", runs: [{ text: "Text", marks: { font: "Aptos", size: 96, bold: true, italic: true, underline: true, strike: true, script: "super", color: "f80", highlight: "#fff" } }] })).toMatchObject({ runs: [{ marks: { color: "#FF8800", highlight: "#FFFFFF" } }] });
  });
  it.each([{ font: "url(evil)" }, { size: 7 }, { size: 97 }, { size: 12.5 }, { color: "red;display:none" }, { onClick: "evil()" }, { script: "javascript" }, { html: "<img onerror=evil()>" }])("rejects unsafe marks %j", marks => {
    expect(RichTextSchema.safeParse({ runs: [{ text: "Text", marks }] }).success).toBe(false);
  });
  it.each([8, 9, 10, 11, 12, 72, 96])("accepts dropdown font size %i", size => {
    expect(RichTextSchema.parse({ runs: [{ text: "Text", marks: { size } }] }).runs[0]!.marks.size).toBe(size);
  });
  it("bounds run count, field names, section keys, and text length", () => {
    expect(RichTextSchema.safeParse({ runs: Array(257).fill({ text: "x", marks: {} }) }).success).toBe(false);
    expect(RichTextSchema.safeParse({ runs: [{ text: "x".repeat(2001) }] }).success).toBe(false);
    expect(WebsiteRichTextSchema.safeParse({ ownerId: plainRichText("forged") }).success).toBe(false);
    expect(WebsiteSectionStylesSchema.safeParse({ "custom-6": { background: "#fff" } }).success).toBe(false);
    expect(WebsiteSectionStylesSchema.safeParse({ hero: { background: "#fff", css: "position:fixed" } }).success).toBe(false);
    expect(WebsiteSectionStylesSchema.parse({ hero: { background: "E8F0FE" } })).toEqual({ hero: { background: "#E8F0FE" } });
  });
  it("rejects inconsistent hidden text, removed sections, and overlong headlines", () => {
    expect(PublishWebsite.safeParse({ ...input(), richText: { name: plainRichText("Different name") } }).success).toBe(false);
    expect(PublishWebsite.safeParse({ ...input(), richText: { "custom-0-body": plainRichText("Not present") } }).success).toBe(false);
    expect(PublishWebsite.safeParse({ ...input(), richText: { contactHeading: plainRichText("x".repeat(201)) } }).success).toBe(false);
    const data = input();
    expect(PublishWebsite.parse({ ...data, richText: { description: plainRichText(data.description) }, sectionStyles: { hero: { background: "#E8F0FE" } } })).toMatchObject({ sectionStyles: { hero: { background: "#E8F0FE" } } });
  });
  it("defaults old content to empty formatting and section overrides", () => {
    const { richText, sectionStyles, ...legacy } = defaultWebsiteContent("CONTACT");
    expect(WebsiteContentSchema.parse(legacy)).toMatchObject({ richText: {}, sectionStyles: {} });
  });
  it("validates and normalizes section and whole-field borders", () => {
    expect(WebsiteSectionStylesSchema.parse({ hero: { borderColor: "abc" } })).toEqual({ hero: { borderColor: "#AABBCC" } });
    const bordered = RichTextSchema.parse({ ...plainRichText("Bordered text"), borderColor: "f80" });
    expect(bordered.borderColor).toBe("#FF8800");
    expect(formatRichText(bordered, 0, 8, { bold: true }).borderColor).toBe("#FF8800");
    expect(changeRichTextCase(bordered, 0, 0, "upper").borderColor).toBe("#FF8800");
    for (const borderColor of ["red", "#12ZZ99", "url(x)", "#123456;position:fixed"]) {
      expect(RichTextSchema.safeParse({ ...plainRichText("Text"), borderColor }).success).toBe(false);
      expect(WebsiteSectionStylesSchema.safeParse({ hero: { borderColor } }).success).toBe(false);
    }
  });
  it("rejects documents over the publication byte limit even when every individual run is valid", () => {
    const runs = Array.from({ length: 256 }, () => ({ text: "x", marks: { font: "Times New Roman" as const, size: 96, color: "#123456", highlight: "#ABCDEF", bold: true, italic: true, underline: true, strike: true } }));
    const text = "x".repeat(256);
    const data = { ...input(), description: text, aboutText: text, openingHours: text };
    const result = PublishWebsite.safeParse({ ...data, richText: Object.fromEntries(["description", "aboutText", "contactDescription", "openingHours"].map(field => [field, { runs }])) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.message)).toEqual(["Website content exceeds 128 KiB."]);
  });
});
