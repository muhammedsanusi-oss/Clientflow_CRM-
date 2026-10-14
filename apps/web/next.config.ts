import type { NextConfig } from "next";
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
