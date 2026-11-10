/*
 * Code guide: vitest.config.ts
 * Integration-test configuration. Resolves workspace imports to source and Next.js request-context mocks to
 * the web app dependency; limits workers because each suite starts an embedded WASM database.
 */
/*
 * Import connection: vitest/config.
 * Typed Vitest configuration helper for source aliases and test-runner options.
 */
import { defineConfig } from "vitest/config";
/*
 * Import connection: node:fs.
 * Built-in filesystem access for local code/configuration/migration files; individual calls below show
 * whether they read or write.
 */
import { readFileSync } from "node:fs";
/*
 * Import connection: node:url.
 * Converts module file URLs into local paths so file lookup is relative to the module rather than the
 * terminal directory.
 */
import { fileURLToPath } from "node:url";

// Resolve workspace sources in the same test module graph, including mocks.
const alias = Object.fromEntries(["auth", "db", "domain", "log", "services"].map((name) => {
  const directory = new URL(`./packages/${name}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("package.json", directory), "utf8"));
  return [manifest.name, fileURLToPath(new URL("src/index.ts", directory))];
}));
// Match the crypto-only entry before the auth package's root prefix alias.
const authName = JSON.parse(readFileSync(new URL("./packages/auth/package.json", import.meta.url), "utf8")).name;
// Request-context mocks and NextRequest must resolve to the web app's Next copy.
alias.next = fileURLToPath(new URL("./apps/web/node_modules/next", import.meta.url));
alias["@"] = fileURLToPath(new URL("./apps/web", import.meta.url));
const aliases = {
  [`${authName}/password`]: fileURLToPath(new URL("./packages/auth/src/password.ts", import.meta.url)),
  [`${authName}/test-accounts`]: fileURLToPath(new URL("./packages/auth/src/test-accounts.ts", import.meta.url)),
  ...alias,
};

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: aliases },
  test: {
    // Each suite boots a WASM database; bound concurrency to avoid startup timeouts.
    maxWorkers: 2,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
