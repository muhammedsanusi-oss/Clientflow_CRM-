/*
 * Code guide: apps/web/app/website/loading.tsx
 * Reuses the website loading placeholder while Next.js resolves this owner route. It is a visual loading
 * state, not an authorization or data-fetching function.
 */
// Re-export connection: { default } -> apps/web/app/businesses/[id]/website/loading.tsx. Importing this entry
// exposes definitions; it does not call them.
export { default } from "../businesses/[id]/website/loading";
