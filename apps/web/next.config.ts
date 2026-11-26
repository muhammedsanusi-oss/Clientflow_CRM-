/*
 * Code guide: apps/web/next.config.ts
 * Next.js build/server configuration. Externalizes embedded database dependencies and retains Prisma
 * runtime/WASM/migration files in deployment tracing. It does not create a database or sign in a user.
 */
/*
 * Import connection: next.
 * Next.js TypeScript configuration/metadata interfaces; imported types are erased from runtime JavaScript.
 * Type NextConfig: Type for Next.js configuration, erased during compilation.
 */
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
/*
 * Import connection: node:url.
 * Converts module file URLs into local paths so file lookup is relative to the module rather than the
 * terminal directory.
 */
import { fileURLToPath } from "node:url";

function developmentDirectory() {
  const instance = process.env.CLIENTFLOW_DEV_INSTANCE;
  if (!instance) return ".next-dev";
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(instance)) {
    throw new Error("CLIENTFLOW_DEV_INSTANCE must be 1-40 lowercase letters, digits, or hyphens, starting with a letter or digit.");
  }
  return `.next-dev-${instance}`;
}

const nextConfig = (phase: string): NextConfig => ({
  // Production and separately named verification servers must not overwrite demo assets.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? developmentDirectory() : ".next",
  // PGlite ships WASM; let Node load it directly instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter"],
  // The shared client is loaded by Node, so deployment tracing must retain
  // its runtime and WASM files outside the web app's bundled chunks.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  outputFileTracingIncludes: {
    "/*": ["../../packages/db/src/generated/prisma/**", "../../packages/db/prisma/migrations/*.sql"],
  },
});

export default nextConfig;
