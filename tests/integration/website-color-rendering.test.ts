import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { BusinessWebsite } from "../../apps/web/components/business-sites/business-website";
import { SectionToolbar } from "../../apps/web/app/businesses/[id]/website/section-toolbar";
import { defaultWebsiteContent } from "../../packages/domain/src/website-content";
import { WEBSITE_TEMPLATE_KEYS } from "../../packages/domain/src/website-templates";
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");

describe("website color rendering", () => {
  it.each(WEBSITE_TEMPLATE_KEYS)("ignores retired border overrides in %s", websiteTemplate => {
    const websiteContent = defaultWebsiteContent(websiteTemplate);
    websiteContent.sectionStyles = { hero: { borderColor: "#ABCDEF" } };
    websiteContent.richText = {
      headline: { runs: [{ text: websiteContent.headline, marks: {} }], borderColor: "#123456" },
      buttonLabel: { runs: [{ text: websiteContent.buttonLabel, marks: {} }], borderColor: "#654321" },
    };
    const html = renderToStaticMarkup(createElement(BusinessWebsite, { site: { name: "Border test", description: "Our story", websiteTemplate, email: "public@example.test", phone_number: "2125550142", publicAddress: "", openingHours: "", websiteContent } }));
    expect(html).not.toContain("border:1px solid #123456");
    expect(html).not.toContain("border:1px solid #654321");
    expect(html).not.toContain('data-website-section="about" style="border:');
    expect(html).not.toContain("site-edit-trigger");
  });
  it.each(WEBSITE_TEMPLATE_KEYS)("uses every custom role in the shared %s renderer", websiteTemplate => {
    const websiteContent = { ...defaultWebsiteContent(websiteTemplate), colors: { page: "#000001", section: "#000002", heading: "#000003", body: "#000004", link: "#000005", button: "#000006", buttonText: "#000007" } };
    const html = renderToStaticMarkup(createElement(BusinessWebsite, { preview: true, site: { id: "colors", name: "Colors", description: "Our business", websiteTemplate, email: "public@example.test", phone_number: "2125550142", publicAddress: "", openingHours: "", websiteContent } }));
    for (const [property, value] of [["bg", "#000001"], ["surface", "#000002"], ["heading", "#000003"], ["text", "#000004"], ["muted", "#000004"], ["link", "#000005"], ["button", "#000006"], ["button-text", "#000007"]]) expect(html).toContain(`--site-${property}:${value}`);
    expect(html).toContain("site-custom-headings"); expect(html).toContain("site-custom-links");
    const legacy = renderToStaticMarkup(createElement(BusinessWebsite, { preview: true, site: { name: "Legacy", description: "Unchanged", websiteTemplate, email: "a@example.test", phone_number: "2125550142", publicAddress: "", openingHours: "" } }));
    expect(legacy).not.toMatch(/--site-(bg|surface|text|muted|heading|link|button):/);
    expect(legacy).not.toContain("site-custom-headings"); expect(legacy).not.toContain("site-custom-links");
  });
  it("renders contextual Word-style controls and nonblocking contrast warnings", () => {
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(SectionToolbar, { section: "hero", current: { font: "Arial", size: 32, color: "#FFFFFF", align: "left" }, background: "#FFFFFF", pageBackground: "#F5F5EB", disabled: false, valid: true, canUndo: false, swatches: [], onFormat: noop, onAlign: noop, onCase: noop, onBackground: noop, onPageBackground: noop, onValidity: noop, onUndo: noop, onReset: noop, onClose: noop, onGesture: noop, onSaveSwatch: noop }));
    for (const label of ["Editing hero section", "Font family", "Bold", "Italic", "Underline", "Text highlight", "Clear formatting", "Section background color", "Page background color", "Readability warning", "You can still publish", "Undo", "Reset section"]) expect(html).toContain(label);
    expect(html).not.toContain("Selected section settings");
    expect(html).not.toContain("Section border");
    expect(html).not.toContain("Text/button border");
    expect(html).toContain('<select aria-label="Font size"');
    for (const size of [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72, 96]) expect(html).toContain(`<option value="${size}"`);
    for (const label of ["Strikethrough", "Subscript", "Superscript", "Increase font size", "Decrease font size"]) expect(html).not.toContain(`aria-label="${label}"`);
  });
  it("publishes safe formatted text and section colors without editor controls", () => {
    const websiteContent = { ...defaultWebsiteContent("CONTACT"), richText: { headline: { runs: [{ text: "Hello ", marks: {} }, { text: "<script>alert(1)</script>", marks: { font: "Georgia" as const, bold: true, color: "#123456" } }] } }, sectionStyles: { hero: { background: "#E8F0FE" } } };
    websiteContent.headline = "Hello <script>alert(1)</script>";
    const html = renderToStaticMarkup(createElement(BusinessWebsite, { site: { name: "Test", description: "Our story", websiteTemplate: "CONTACT", email: "public@example.test", phone_number: "2125550142", publicAddress: "", openingHours: "", websiteContent } }));
    expect(html).toContain("background-color:#E8F0FE"); expect(html).toContain("font-weight:700"); expect(html).toContain("color:#123456"); expect(html).toContain("Georgia");
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
    expect(html).not.toContain("contentEditable"); expect(html).not.toContain("site-edit-trigger"); expect(html).not.toContain("site-inline-tools");
  });
});
