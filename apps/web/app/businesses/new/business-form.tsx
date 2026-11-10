/*
 * Code guide: apps/web/app/businesses/new/business-form.tsx
 * Compatibility re-export: BusinessForm points to WebsiteBusinessForm. The template cards, preview,
 * sample-fill button, and business creation fields are implemented in website-business-form.tsx.
 */
// Re-export connection: { WebsiteBusinessForm as BusinessForm } ->
// apps/web/app/businesses/new/website-business-form.tsx. Importing this entry exposes definitions; it does
// not call them.
export { WebsiteBusinessForm as BusinessForm } from "./website-business-form";
