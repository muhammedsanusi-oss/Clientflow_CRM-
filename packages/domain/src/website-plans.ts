import { z } from "zod";
import type { WebsiteContent } from "./website-content";

export const WebsitePlanSchema = z.enum(["FREE", "PLUS", "PREMIUM"]);
export type WebsitePlanKey = z.infer<typeof WebsitePlanSchema>;

export const WEBSITE_PLANS = {
  FREE: {
    label: "Free",
    price: "$0.00",
    maxImages: 10,
    maxFeatureRequests: 0,
    canAddSections: false,
  },
  PLUS: {
    label: "Plus",
    price: "$19.99/month",
    maxImages: 20,
    maxFeatureRequests: 5,
    canAddSections: true,
  },
  PREMIUM: {
    label: "Premium",
    price: "$59.99/month",
    maxImages: 50,
    maxFeatureRequests: null,
    canAddSections: true,
  },
} as const;

export function countWebsiteImages(content: Pick<WebsiteContent, "sectionImages" | "additionalSections" | "logoImage" | "heroImage">) {
  const references = new Set<string>();
  for (const images of Object.values(content.sectionImages)) {
    for (const image of images) references.add(image);
  }
  for (const section of content.additionalSections) {
    for (const image of section.images) references.add(image);
  }
  if (content.logoImage) references.add(content.logoImage);
  if (content.heroImage) references.add(content.heroImage);
  return references.size;
}

export const WebsiteFeatureRequest = z.object({
  title: z.string().trim().min(1, "Enter a feature title.").max(100),
  description: z.string().trim().min(1, "Describe the feature.").max(2000),
}).strict();
export type WebsiteFeatureRequestInput = z.infer<typeof WebsiteFeatureRequest>;
