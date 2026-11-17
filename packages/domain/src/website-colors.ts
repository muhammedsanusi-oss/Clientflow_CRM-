/** Client-safe website color validation, template fallbacks, and picker math. */
import { z } from "zod";
import type { WebsiteTemplateKey } from "./website-templates";

export const WEBSITE_COLOR_ROLES = {
  page: "Page background", section: "Section background", heading: "Headings",
  body: "Body text", link: "Links", button: "Button background", buttonText: "Button text",
} as const;
export type WebsiteColorRole = keyof typeof WEBSITE_COLOR_ROLES;
export function normalizeHex(value: string): string | null {
  let hex = value.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(hex)) hex = [...hex].map(char => char + char).join("");
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}
export const HexColor = z.string().max(32).transform((value, ctx) => {
  const color = normalizeHex(value);
  if (!color) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a HEX color, such as #2563EB." }); return z.NEVER; }
  return color;
});
export const WebsiteColorsSchema = z.object({
  page: HexColor.optional(), section: HexColor.optional(), heading: HexColor.optional(),
  body: HexColor.optional(), link: HexColor.optional(), button: HexColor.optional(), buttonText: HexColor.optional(),
}).strict().default({});
export const WebsiteColorSwatchesSchema = z.array(HexColor).max(12)
  .transform(colors => [...new Set(colors)]).default([]);
export type WebsiteColors = z.infer<typeof WebsiteColorsSchema>;

const palettes: Record<WebsiteTemplateKey, [string, string, string, string, string, string]> = {
  BAKERY: ["#FBF5E9", "#F1E6D2", "#403025", "#7E6C5E", "#88451E", "#FFFAF1"],
  BARBERSHOP: ["#151C1B", "#202927", "#F2E8D5", "#B9B7A7", "#D3AD73", "#151C1B"],
  SALON: ["#FAF6F0", "#F0E4DC", "#493C3A", "#84716D", "#85594D", "#FFFAF5"],
  CONTACT: ["#F5F5EB", "#E9EDDF", "#263A2F", "#687362", "#3E5945", "#FFFEF8"],
};
export const legacyTextColors = { OCEAN: "#1E3A8A", FOREST: "#14532D", TERRACOTTA: "#9A3412", PLUM: "#6B21A8" };
export const legacyDarkTextColors = { OCEAN: "#93C5FD", FOREST: "#86EFAC", TERRACOTTA: "#FDBA74", PLUM: "#D8B4FE" };
export function resolvedWebsiteColors(template: WebsiteTemplateKey, textColor: string, colors: WebsiteColors): Record<WebsiteColorRole, string> {
  const [page, section, ink, muted, accent, buttonText] = palettes[template];
  const legacy = (template === "BARBERSHOP" ? legacyDarkTextColors : legacyTextColors)[textColor as keyof typeof legacyTextColors];
  return { page, section, heading: legacy ?? ink, body: legacy ?? muted,
    link: legacy ?? accent, button: legacy ?? accent, buttonText, ...colors };
}
export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = !delta ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [(hue * 60 + 360) % 360, max ? delta / max : 0, max];
}
export function hsvToHex(hue: number, saturation: number, brightness: number): string {
  const c = brightness * saturation, x = c * (1 - Math.abs(hue / 60 % 2 - 1)), m = brightness - c;
  const rgb = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + rgb.map(value => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
