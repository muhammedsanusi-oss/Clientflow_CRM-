/*
 * Code guide: apps/db-server/src/index.ts
 * Local PostgreSQL host started by pnpm dev. Owns the existing .pgdata directory, listens on DB_PORT (15432
 * by default), and applies append-only SQL migrations. Client processes connect through DATABASE_URL; this is
 * not a web page.
 */
// Dev-only PostgreSQL server. Starts a real Postgres process, owns the .pgdata/
// directory, and auto-applies migrations on boot. Replaced by Azure Postgres in
// production (Week 10) — same Prisma client, different DATABASE_URL.

/*
 * Import connection: embedded-postgres.
 * Starts the local native PostgreSQL child process and uses the existing .pgdata directory; the web app
 * connects to that server through pg/Prisma.
 */
import EmbeddedPostgres from "embedded-postgres";
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
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";
/*
 * Import connection: node:fs.
 * Built-in filesystem access for local code/configuration/migration files; individual calls below show
 * whether they read or write.
 */
import { existsSync } from "node:fs";
/*
 * Import connection: node:url.
 * Converts module file URLs into local paths so file lookup is relative to the module rather than the
 * terminal directory.
 */
import { fileURLToPath } from "node:url";
/*
 * Import connection: node:path.
 * Built-in path utilities for resolving file locations; does not perform a filesystem operation by itself.
 */
import { dirname, resolve } from "node:path";

const PORT = Number(process.env.DB_PORT ?? 15432);
const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".pgdata");

/*
 * Local PostgreSQL host started by pnpm dev. Owns the existing .pgdata directory, listens on DB_PORT (15432
 * by default), and applies append-only SQL migrations. Client processes connect through DATABASE_URL; this is
 * not a web page.
 */
async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
  });

  if (!existsSync(DATA_DIR)) {
    log.info({ dataDir: DATA_DIR }, "first run — initializing database cluster");
    await pg.initialise();
  }
  await pg.start();

  const client = new Client({
    host: "127.0.0.1",
    port: PORT,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
  await client.connect();
  await applyMigrations(
    {
      exec: async (sql) => void (await client.query(sql)),
      query: async (sql, params) => client.query(sql, params),
    },
    (msg) => log.info(msg)
  );
  await client.end();

  log.info(
    { port: PORT, dataDir: DATA_DIR },
    "postgres ready — this process owns the data; everything else (web, worker, psql) connects as a client"
  );

  const stop = async () => {
    log.info("stopping postgres…");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  log.error({ err: String(err) }, "db server failed — port in use? another `pnpm dev` running?");
  process.exit(1);
});
