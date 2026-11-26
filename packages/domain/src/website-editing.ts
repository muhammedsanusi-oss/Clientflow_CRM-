/*
 * Code guide: packages/domain/src/website-editing.ts
 * Shared Zod validation contract for website publication. Defines editable public fields, template choices,
 * text/array limits, and the expected version. Database publication itself is implemented in websites.ts.
 */
// Shared website publication validation; safe for client type imports.
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";
import { WebsiteColorsSchema, WebsiteColorSwatchesSchema } from "./website-colors";
import { WebsiteRichTextSchema, WebsiteSectionStylesSchema, richTextValue, textLimit } from "./website-rich-text";
/*
 * Import connection: ./website-templates -> packages/domain/src/website-templates.ts.
 * WEBSITE_TEMPLATE_KEYS: Allowlist of the four accepted website template keys.
 */
import { WEBSITE_TEMPLATE_KEYS } from "./website-templates";
import {
  WEBSITE_FONT_FAMILIES,
  WebsiteSectionImagesSchema,
  WebsitePhotoDetailsSchema,
  WEBSITE_TEXT_COLORS,
  WEBSITE_TEXT_SCALES,
} from "./website-content";

const text = (max: number) => z.string().trim().min(1, "This field is required.").max(max);
const section = z.object({
  heading: text(100),
  body: text(2000),
  images: z.array(z.string().max(300)).max(10).default([]),
}).strict();
// Strict shared publication schema for editable fields, text limits, array limits, and version checks.
export const PublishWebsite = z.object({
  version: z.number().int().min(0).max(2147483646),
  name: text(100), description: text(1000), websiteTemplate: z.enum(WEBSITE_TEMPLATE_KEYS),
  email: text(254).toLowerCase().email(), phone_number: text(30).min(7),
  publicAddress: z.string().trim().max(300), openingHours: z.string().trim().max(500),
  eyebrow: text(100), headline: text(200), sectionTitle: text(160), buttonLabel: text(60),
  features: z.array(text(100)).max(3), offerings: z.array(text(100)).max(6),
  fontFamily: z.enum(WEBSITE_FONT_FAMILIES),
  textColor: z.enum(WEBSITE_TEXT_COLORS),
  textScale: z.enum(WEBSITE_TEXT_SCALES),
  colors: WebsiteColorsSchema,
  colorSwatches: WebsiteColorSwatchesSchema,
  richText: WebsiteRichTextSchema,
  sectionStyles: WebsiteSectionStylesSchema,
  sectionImages: WebsiteSectionImagesSchema,
  photoDetails: WebsitePhotoDetailsSchema,
  additionalSections: z.array(section).max(6),
  aboutText: z.string().trim().max(1000),
  logoImage: z.string().max(300),
  heroImage: z.string().max(300),
}).strict().superRefine((values, ctx) => {
  const photos = new Set([...Object.values(values.sectionImages).flat(), ...values.additionalSections.flatMap(s => s.images)]);
  for (const ref of Object.keys(values.photoDetails)) if (!photos.has(ref)) ctx.addIssue({ code: "custom", path: ["photoDetails"], message: "Photo settings must belong to a photo placed on this website." });
  if (new TextEncoder().encode(JSON.stringify(values)).length > 128 * 1024) ctx.addIssue({ code: "custom", message: "Website content exceeds 128 KiB." });
  for (const [field, document] of Object.entries(values.richText)) {
    const text = richTextValue(document);
    if (text.length > textLimit(field)) ctx.addIssue({ code: "custom", path: ["richText", field], message: "Text is too long." });
    const custom = /^custom-([0-5])-(heading|body)$/.exec(field);
    const feature = /^feature-([0-2])$/.exec(field), offering = /^offering-([0-5])$/.exec(field);
    const expected = custom ? values.additionalSections[Number(custom[1])]?.[custom[2] as "heading" | "body"]
      : feature ? values.features[Number(feature[1])] : offering ? values.offerings[Number(offering[1])]
      : field in values && typeof values[field as keyof typeof values] === "string" ? values[field as keyof typeof values] as string : undefined;
    if (expected !== undefined && (field === "email" ? text.trim().toLowerCase() : text.trim()) !== expected.trim()) ctx.addIssue({ code: "custom", path: ["richText", field], message: "Text formatting must match the edited text." });
    if ((custom || feature || offering) && expected === undefined) ctx.addIssue({ code: "custom", path: ["richText", field], message: "Text section no longer exists." });
  }
});
// Type contract: PublishWebsiteInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type PublishWebsiteInput = z.infer<typeof PublishWebsite>;
