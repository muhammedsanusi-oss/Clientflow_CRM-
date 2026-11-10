/*
 * Code guide: apps/web/app/website/error.tsx
 * Reuses the website retry boundary for owner-route rendering failures. Retrying asks Next.js to render
 * again; it does not publish edits.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";
// Re-export connection: { default } -> apps/web/app/businesses/[id]/website/error.tsx. Importing this entry
// exposes definitions; it does not call them.
export { default } from "../businesses/[id]/website/error";
