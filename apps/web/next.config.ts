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
/*
 * Import connection: node:url.
 * Converts module file URLs into local paths so file lookup is relative to the module rather than the
 * terminal directory.
 */
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // PGlite ships WASM; let Node load it directly instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter"],
  // The shared client is loaded by Node, so deployment tracing must retain
  // its runtime and WASM files outside the web app's bundled chunks.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  outputFileTracingIncludes: {
    "/*": ["../../packages/db/src/generated/prisma/**", "../../packages/db/prisma/migrations/*.sql"],
  },
};

export default nextConfig;
