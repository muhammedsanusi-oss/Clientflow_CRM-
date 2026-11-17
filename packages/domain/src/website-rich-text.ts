/** Structured, client-safe formatting. HTML and CSS strings never cross publication. */
import { z } from "zod";
import { HexColor } from "./website-colors";

export const WEBSITE_FONTS = ["Aptos", "Arial", "Verdana", "Trebuchet MS", "Georgia", "Times New Roman", "Courier New"] as const;
export const WEBSITE_FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72, 96] as const;
export const sectionKey = /^(header|hero|features|about|offerings|contact|footer|custom-[0-5])$/;
export const textFieldKey = /^(name|eyebrow|headline|description|buttonLabel|sectionTitle|aboutText|email|phone_number|publicAddress|openingHours|aboutEyebrow|contactEyebrow|contactHeading|contactDescription|contactFormHeading|offeringsHeading|offeringsDescription|footerText|feature-[0-2]|offering-[0-5]|custom-[0-5]-(heading|body))$/;
export const TextMarksSchema = z.object({
  font: z.enum(WEBSITE_FONTS).optional(), size: z.number().int().min(8).max(96).optional(),
  bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), strike: z.boolean().optional(),
  script: z.enum(["normal", "sub", "super"]).optional(), color: HexColor.optional(), highlight: HexColor.optional(),
}).strict();
export const RichTextSchema = z.object({
  runs: z.array(z.object({ text: z.string().max(2000), marks: TextMarksSchema.default({}) }).strict()).min(1).max(256),
  align: z.enum(["left", "center", "right"]).optional(),
  borderColor: HexColor.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.runs.reduce((total, run) => total + run.text.length, 0) > 2000) ctx.addIssue({ code: "custom", message: "Text is too long." });
});
export const WebsiteRichTextSchema = z.record(z.string().regex(textFieldKey), RichTextSchema).default({});
export const WebsiteSectionStylesSchema = z.record(z.string().regex(sectionKey), z.object({ background: HexColor.optional(), borderColor: HexColor.optional() }).strict()).default({});
export type TextMarks = z.infer<typeof TextMarksSchema>;
export type RichText = z.infer<typeof RichTextSchema>;
export type WebsiteRichText = z.infer<typeof WebsiteRichTextSchema>;
export type WebsiteSectionStyles = z.infer<typeof WebsiteSectionStylesSchema>;

export function plainRichText(text: string): RichText { return { runs: [{ text, marks: {} }] }; }
export function richTextValue(value: RichText): string { return value.runs.map(run => run.text).join(""); }
export function textLimit(field: string): number {
  if (field === "description" || field === "aboutText" || field === "contactDescription") return 1000;
  if (field === "offeringsDescription") return 500;
  if (field.endsWith("-body")) return 2000;
  if (field === "headline" || field === "contactHeading") return 200;
  if (field === "sectionTitle") return 160;
  if (field === "buttonLabel") return 60;
  if (field === "email") return 254;
  if (field === "phone_number") return 30;
  if (field === "publicAddress") return 300;
  if (field === "openingHours") return 500;
  return 100;
}
export function fieldSection(field: string): string {
  if (field.startsWith("custom-")) return field.split("-").slice(0, 2).join("-");
  if (field === "name") return "header";
  if (["eyebrow", "headline", "description", "buttonLabel"].includes(field)) return "hero";
  if (field.startsWith("feature-")) return "features";
  if (["sectionTitle", "aboutText", "aboutEyebrow"].includes(field)) return "about";
  if (field.startsWith("offering")) return "offerings";
  if (field === "footerText") return "footer";
  return "contact";
}
/** Splits only the requested range; adjacent identical marks are merged. */
export function formatRichText(document: RichText, start: number, end: number, patch: Partial<TextMarks>, clear = false): RichText {
  const length = richTextValue(document).length;
  if (start === end) { start = 0; end = length; }
  start = Math.max(0, Math.min(start, length)); end = Math.max(start, Math.min(end, length));
  const runs: RichText["runs"] = [];
  let offset = 0;
  for (const run of document.runs) {
    const from = Math.max(0, Math.min(run.text.length, start - offset));
    const to = Math.max(from, Math.min(run.text.length, end - offset));
    if (from) runs.push({ text: run.text.slice(0, from), marks: { ...run.marks } });
    if (to > from) runs.push({ text: run.text.slice(from, to), marks: clear ? {} : { ...run.marks, ...patch } });
    if (to < run.text.length) runs.push({ text: run.text.slice(to), marks: { ...run.marks } });
    offset += run.text.length;
  }
  const merged: RichText["runs"] = [];
  for (const run of runs) {
    const previous = merged.at(-1);
    if (previous && JSON.stringify(previous.marks) === JSON.stringify(run.marks)) previous.text += run.text;
    else merged.push(run);
  }
  return { ...document, runs: merged.length ? merged : [{ text: "", marks: clear ? {} : patch }] };
}

export function changeRichTextCase(document: RichText, start: number, end: number, kind: string): RichText {
  if (start === end) { start = 0; end = richTextValue(document).length; }
  let offset = 0;
  const runs = document.runs.flatMap(run => {
    const before = offset; offset += run.text.length;
    const from = Math.max(0, Math.min(run.text.length, start - before));
    const to = Math.max(from, Math.min(run.text.length, end - before));
    const selected = run.text.slice(from, to);
    const changed = kind === "upper" ? selected.toUpperCase() : kind === "lower" ? selected.toLowerCase()
      : selected.toLowerCase().replace(/\b\p{L}/gu, char => char.toUpperCase());
    return [
      { ...run, text: run.text.slice(0, from) }, { ...run, text: changed }, { ...run, text: run.text.slice(to) },
    ].filter(item => item.text.length > 0);
  });
  return { ...document, runs: runs.length ? runs : plainRichText("").runs };
}
