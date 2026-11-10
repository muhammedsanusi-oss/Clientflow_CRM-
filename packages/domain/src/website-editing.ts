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
/*
 * Import connection: ./website-templates -> packages/domain/src/website-templates.ts.
 * WEBSITE_TEMPLATE_KEYS: Allowlist of the four accepted website template keys.
 */
import { WEBSITE_TEMPLATE_KEYS } from "./website-templates";
import {
  WEBSITE_FONT_FAMILIES,
  WebsiteSectionImagesSchema,
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
  sectionImages: WebsiteSectionImagesSchema,
  additionalSections: z.array(section).max(6),
  aboutText: z.string().trim().max(1000),
  logoImage: z.string().max(300),
  heroImage: z.string().max(300),
}).strict();
// Type contract: PublishWebsiteInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type PublishWebsiteInput = z.infer<typeof PublishWebsite>;
