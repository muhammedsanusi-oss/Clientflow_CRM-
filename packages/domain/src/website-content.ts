/*
 * Code guide: packages/domain/src/website-content.ts
 * Client-safe content type and template-to-content mapper. Separates editable text/arrays from login identity
 * and persistence metadata; shared by editor previews and saved website rendering.
 */
// Shared presentation types and defaults; safe to import into client previews.
import { z } from "zod";
import { WebsiteColorsSchema, WebsiteColorSwatchesSchema } from "./website-colors";
import { WebsiteRichTextSchema, WebsiteSectionStylesSchema } from "./website-rich-text";
/*
 * Import connection: ./website-templates -> packages/domain/src/website-templates.ts.
 * WEBSITE_TEMPLATES: Catalogue of standard layouts, display copy, fictional sample contact details, and
 * template metadata.
 * Type WebsiteTemplateKey: Type restricting template selection to the supported catalogue keys.
 */
import { WEBSITE_TEMPLATES, type WebsiteTemplateKey } from "./website-templates";

export const WEBSITE_FONT_FAMILIES = ["SANS", "SERIF"] as const;
export const WEBSITE_TEXT_COLORS = ["INK", "OCEAN", "FOREST", "TERRACOTTA", "PLUM"] as const;
export const WEBSITE_TEXT_SCALES = ["SMALL", "STANDARD", "LARGE"] as const;
export const WEBSITE_IMAGE_SECTIONS = ["header", "hero", "features", "about", "offerings", "contact"] as const;
export type WebsiteImageSection = typeof WEBSITE_IMAGE_SECTIONS[number];
// The filename varies when a gallery position changes, preventing stale cached photos.
export function websiteImageUrl(businessId: string, section: string, index: number, imageRef: string) {
  return `/api/sites/${encodeURIComponent(businessId)}/image/${section}-${index}?photo=${encodeURIComponent(imageRef.split("/").at(-1) ?? "")}`;
}
const emptyImageList = () => z.array(z.string().max(300)).max(10).default([]);
export const WebsiteSectionImagesSchema = z.object({
  header: emptyImageList(),
  hero: emptyImageList(),
  features: emptyImageList(),
  about: emptyImageList(),
  offerings: emptyImageList(),
  contact: emptyImageList(),
}).strict();
export type WebsiteSectionImages = z.infer<typeof WebsiteSectionImagesSchema>;
export function defaultWebsiteSectionImages(): WebsiteSectionImages {
  return { header: [], hero: [], features: [], about: [], offerings: [], contact: [] };
}
const websiteTextSection = z.object({
  heading: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(2000),
  images: emptyImageList(),
}).strict();
export const WebsitePhotoDetailsSchema = z.record(z.string().min(1).max(300), z.object({
  widthPercent: z.number().int().min(25).max(100).optional(),
  name: z.string().trim().max(120).optional(),
  priceCents: z.number().int().min(1).max(1_000_000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.priceCents !== undefined && !value.name) ctx.addIssue({ code: "custom", message: "Add a product name before setting its price." });
})).refine(value => Object.keys(value).length <= 120, "Too many photo settings.").default({});
export type WebsitePhotoDetails = z.infer<typeof WebsitePhotoDetailsSchema>;
export const WebsiteContentSchema = z.object({
  eyebrow: z.string().trim().min(1).max(100),
  headline: z.string().trim().min(1).max(200),
  sectionTitle: z.string().trim().min(1).max(160),
  buttonLabel: z.string().trim().min(1).max(60),
  features: z.array(z.string().trim().min(1).max(100)).max(3),
  offerings: z.array(z.string().trim().min(1).max(100)).max(6),
  fontFamily: z.enum(WEBSITE_FONT_FAMILIES),
  textColor: z.enum(WEBSITE_TEXT_COLORS),
  textScale: z.enum(WEBSITE_TEXT_SCALES),
  colors: WebsiteColorsSchema,
  colorSwatches: WebsiteColorSwatchesSchema,
  richText: WebsiteRichTextSchema,
  sectionStyles: WebsiteSectionStylesSchema,
  sectionImages: WebsiteSectionImagesSchema.default(defaultWebsiteSectionImages),
  photoDetails: WebsitePhotoDetailsSchema,
  additionalSections: z.array(websiteTextSection).max(6),
  aboutText: z.string().trim().max(1000),
  logoImage: z.string().max(300).nullable(),
  heroImage: z.string().max(300).nullable(),
}).strict();
export type WebsiteContent = z.infer<typeof WebsiteContentSchema>;

/*
 * Copies the selected template default headings, button text, feature labels, and offerings into an editable
 * content object. Does not read or write the database.
 */
export function defaultWebsiteContent(template: WebsiteTemplateKey, aboutText = ""): WebsiteContent {
  const defaults = WEBSITE_TEMPLATES[template];
  return {
    eyebrow: defaults.eyebrow, headline: defaults.headline, sectionTitle: defaults.sectionTitle,
    buttonLabel: template === "CONTACT" ? "Start a conversation" : "Say hello",
    features: [...defaults.features], offerings: [...defaults.offerings],
    fontFamily: "SANS", textColor: "INK", textScale: "STANDARD",
    colors: {}, colorSwatches: [], richText: {}, sectionStyles: {},
    sectionImages: defaultWebsiteSectionImages(), photoDetails: {},
    additionalSections: [], aboutText, logoImage: null, heroImage: null,
  };
}
