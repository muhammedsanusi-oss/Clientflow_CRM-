import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
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
