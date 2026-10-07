import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolve workspace sources in the same test module graph, including mocks.
const alias = Object.fromEntries(["auth", "db", "domain", "log", "services"].map((name) => {
  const directory = new URL(`./packages/${name}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("package.json", directory), "utf8"));
  return [manifest.name, fileURLToPath(new URL("src/index.ts", directory))];
}));

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
