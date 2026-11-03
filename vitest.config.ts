import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolve workspace sources in the same test module graph, including mocks.
const alias = Object.fromEntries(["auth", "db", "domain", "log", "services"].map((name) => {
  const directory = new URL(`./packages/${name}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("package.json", directory), "utf8"));
  return [manifest.name, fileURLToPath(new URL("src/index.ts", directory))];
}));
// Request-context mocks and NextRequest must resolve to the web app's Next copy.
alias.next = fileURLToPath(new URL("./apps/web/node_modules/next", import.meta.url));
alias["@"] = fileURLToPath(new URL("./apps/web", import.meta.url));

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias },
  test: {
    // Each suite boots a WASM database; bound concurrency to avoid startup timeouts.
    maxWorkers: 2,
    // Auth.js uses Next's extensionless imports, which need Vite's resolver in tests.
    server: { deps: { inline: ["next-auth"] } },
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
