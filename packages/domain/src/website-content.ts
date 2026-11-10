/*
 * Code guide: packages/domain/src/website-content.ts
 * Client-safe content type and template-to-content mapper. Separates editable text/arrays from login identity
 * and persistence metadata; shared by editor previews and saved website rendering.
 */
// Shared presentation types and defaults; safe to import into client previews.
import { z } from "zod";
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
  sectionImages: WebsiteSectionImagesSchema.default(defaultWebsiteSectionImages),
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
    sectionImages: defaultWebsiteSectionImages(),
    additionalSections: [], aboutText, logoImage: null, heroImage: null,
  };
}
