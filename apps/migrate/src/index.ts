/*
 * Code guide: apps/migrate/src/index.ts
 * Command-line migration runner for the configured PostgreSQL database. Applies pending SQL migrations using
 * the same runner as local startup; it is not executed by browsing a page.
 */
// Applies pending SQL migrations against any DATABASE_URL. Used by CI.
// The dev server also auto-applies on boot, so local dev rarely needs this.

/*
 * Import connection: pg.
 * Node PostgreSQL driver for direct SQL connections. Connection settings come from this module server/client
 * configuration.
 */
import { Client } from "pg";
/*
 * Import connection: @project/db/migrate -> packages/db/src/apply-migrations.ts.
 * applyMigrations: Reads numbered SQL files in filename order, skips recorded migrations, and records
 * successful applications. It never rewrites migration files.
 */
import { applyMigrations } from "@project/db/migrate";

const url =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:15432/postgres";

/*
 * Command-line migration runner for the configured PostgreSQL database. Applies pending SQL migrations using
 * the same runner as local startup; it is not executed by browsing a page.
 */
async function main() {
  const client = new Client({ connectionString: url });
  await client.connect().catch(() => {
    console.error(`Could not reach ${url.replace(/:[^:@/]+@/, ":***@")}`);
    console.error("Is the dev server running? (`pnpm dev` starts the local database.)");
    process.exit(1);
  });
  await applyMigrations(
    {
      exec: async (sql) => void (await client.query(sql)),
      query: async (sql, params) => client.query(sql, params),
    },
    console.log
  );
  await client.end();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
