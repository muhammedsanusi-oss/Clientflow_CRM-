/*
 * Code guide: packages/db/src/client.ts
 * Database connection boundary shared by web/domain code. DATABASE_URL selects a real PostgreSQL server
 * (local default 15432); PGLITE_DATA_DIR selects the embedded test engine. Global caching avoids duplicate
 * clients across Next.js module reloads.
 */
// The Prisma client. One client per process, cached in a global to survive
// hot reloads. Three doors: PGlite (tests), local Postgres (dev), Azure (prod).

/*
 * Import connection: node:module.
 * Creates a Node-native module loader so generated Prisma/WASM or package-relative tools resolve from the
 * intended directory.
 */
import nodeModule from "node:module";

// Keep the generated client outside the app bundle: its WASM compiler is
// resolved relative to its own directory, not the Next.js working directory.
// The module object's method avoids Webpack's named-createRequire rewrite,
// which would relocate the compiler's filesystem lookup into the app bundle.
const nativeRequire = nodeModule.createRequire(import.meta.url);
export const { PrismaClient } = nativeRequire("./generated/prisma") as typeof import("./generated/prisma");
// Type contract: PrismaClient. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
export type PrismaClient = InstanceType<typeof PrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // Cache initialization too, so concurrent runtimes cannot open two clients.
  var __prismaPromise: Promise<PrismaClient> | undefined;
}

export const LOCAL_DEV_URL = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";

/*
 * Initializes the shared database client: PGlite plus migrations for tests, or a pg connection pool for real
 * local/hosted PostgreSQL. The resolved client and in-flight initialization are cached.
 */
async function makeClient(): Promise<PrismaClient> {
  if (process.env.PGLITE_DATA_DIR) {
    // Test door: embedded engine, no server.
    // Lazy import connection: @electric-sql/pglite. Embedded PostgreSQL-compatible WASM engine used by disposable
    // tests instead of the real TCP database.
    const { PGlite } = await import("@electric-sql/pglite");
    // Lazy import connection: pglite-prisma-adapter. Connects the generated Prisma client to the embedded PGlite
    // engine.
    const { PrismaPGlite } = await import("pglite-prisma-adapter");
    // Lazy import connection: ./apply-migrations -> packages/db/src/apply-migrations.ts. Loaded only when this
    // execution path needs the module.
    const { applyMigrations } = await import("./apply-migrations");
    const pglite = new PGlite(process.env.PGLITE_DATA_DIR);
    await applyMigrations(pglite as unknown as Parameters<typeof applyMigrations>[0]);
    return new PrismaClient({ adapter: new PrismaPGlite(pglite) });
  }

  // Dev + prod door: a real server over the wire.
  // Lazy import connection: @prisma/adapter-pg. Connects the generated Prisma client to a pg connection pool
  // for real PostgreSQL.
  const { PrismaPg } = await import("@prisma/adapter-pg");
  // Lazy import connection: pg. Node PostgreSQL driver for direct SQL connections. Connection settings come
  // from this module server/client configuration.
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? LOCAL_DEV_URL,
    max: Number(process.env.PG_POOL_MAX ?? Number(process.env.DATABASE_URL ? 1 : 5)),
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Next.js hot-reloads modules in dev; the global stops us opening a new
// client on every save. (Top-level await is fine in server modules.)
export const prisma = globalThis.__prisma ?? (await (globalThis.__prismaPromise ??= makeClient()));
// Next's page/action and route runtimes can load separate copies of this module.
// Share the process client in production too, especially for embedded PGlite.
globalThis.__prisma = prisma;
