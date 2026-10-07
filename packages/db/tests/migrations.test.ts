import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { applyMigrations } from "../src/apply-migrations";

const require = createRequire(import.meta.url);
const migration = (name: string) => readFile(new URL(`../prisma/migrations/${name}`, import.meta.url), "utf8");
const catalog = async (db: PGlite) => ({
  enums: (await db.query(`SELECT t.typname, e.enumlabel, e.enumsortorder FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder`)).rows,
  columns: (await db.query(`SELECT table_name, column_name, udt_name, is_nullable, column_default,
    numeric_precision, numeric_scale, datetime_precision FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name <> '_migrations' ORDER BY table_name, column_name`)).rows,
  indexes: (await db.query(`SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename <> '_migrations' ORDER BY indexname`)).rows,
  constraints: (await db.query(`SELECT conname, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE n.nspname = 'public' AND t.relname <> '_migrations' ORDER BY conname`)).rows,
});

describe("SQL migration contract", () => {
  it("replays and reruns cleanly, with columns, defaults, indexes and constraints matching schema.prisma", async () => {
    const migrated = new PGlite();
    const expected = new PGlite();
    try {
      await applyMigrations(migrated);
      await applyMigrations(migrated);
      const sql = execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "diff",
        "--from-empty", "--to-schema-datamodel", fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url)), "--script"],
        { encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgresql://unused:unused@localhost:5433/unused" } });
      await expected.exec(sql);
      expect(await catalog(migrated)).toEqual(await catalog(expected));
      expect((await migrated.query("SELECT name FROM _migrations ORDER BY name")).rows).toHaveLength(4);
    } finally {
      await migrated.close();
      await expected.close();
    }
  }, 30000);

  it("preserves populated legacy records, converts lookup values and backfills timestamps", async () => {
    const db = new PGlite();
    try {
      await db.exec(await migration("0001_init.sql"));
      await db.exec(`
        INSERT INTO "Employee_role" VALUES ('role-owner', 'Owner', 'Legacy owner');
        INSERT INTO "Interaction_type" VALUES ('type-call', 'Call', 'Legacy call');
        INSERT INTO "Employee" VALUES ('employee', 'Ada', 'Owner', 'ada@example.com', '1234567890', 'role-owner', true, '2025-01-01', '2025-01-01');
        INSERT INTO "Customer" VALUES ('customer', 'Grace', 'Customer', '0987654321', 'grace@example.com', 'Main Street', 'EMAIL', '2025-01-01', '2025-01-01');
        INSERT INTO "Note" VALUES ('note', 'customer', 'employee', '2025-01-01', 'Keep this note', '2025-01-01');
        INSERT INTO "Task" VALUES ('task', 'customer', 'employee', 'Follow up', 'Keep this task', '2025-01-02', '2025-01-01', '2025-01-01');
        INSERT INTO "Appointment" VALUES ('appointment', 'customer', 'employee', '2025-01-02', '2025-01-02 09:00', '2025-01-02 10:00', 'scheduled', 'Keep appointment', '2025-01-01', '2025-01-01');
        INSERT INTO "Interaction" VALUES ('interaction', 'customer', 'employee', 'type-call', 'Follow up', 'Keep interaction', '2025-01-01', '2025-01-01');
        INSERT INTO "Payment" VALUES ('payment', 'appointment', 'customer', 'CASH', '2025-01-01', 'COMPLETED', 'reference');
      `);
      await db.exec(await migration("0002_business_tenancy.sql"));
      await db.exec(await migration("0003_reconcile_schema.sql"));
      await db.exec(await migration("0004_schema_update.sql"));
      expect((await db.query('SELECT "role_id" FROM "Employee"')).rows).toEqual([{ role_id: "OWNER" }]);
      expect((await db.query('SELECT "type_id" FROM "Interaction"')).rows).toEqual([{ type_id: "CALL" }]);
      expect((await db.query('SELECT "status_id" FROM "Appointment"')).rows).toEqual([{ status_id: "SCHEDULED" }]);
      expect((await db.query('SELECT "status" FROM "Task"')).rows).toEqual([{ status: "PENDING" }]);
      expect((await db.query('SELECT "content", "updated_at" = "created_at" AS backfilled FROM "Note"')).rows)
        .toEqual([{ content: "Keep this note", backfilled: true }]);
      expect((await db.query('SELECT "transaction_reference" FROM "Payment"')).rows).toEqual([{ transaction_reference: "reference" }]);
      expect((await db.query('SELECT "name" FROM legacy."Employee_role"')).rows).toEqual([{ name: "Owner" }]);
    } finally { await db.close(); }
  }, 30000);

  it("rejects unsupported legacy roles and rolls the conversion back", async () => {
    const db = new PGlite();
    try {
      await db.exec(await migration("0001_init.sql"));
      await db.exec(`INSERT INTO "Employee_role" VALUES ('custom', 'Custom role', 'Needs review');
        INSERT INTO "Employee" VALUES ('employee', 'Ada', 'Owner', 'ada@example.com', '1234567890', 'custom', true, '2025-01-01', '2025-01-01');`);
      await db.exec(await migration("0002_business_tenancy.sql"));
      await expect(db.exec(await migration("0003_reconcile_schema.sql"))).rejects.toThrow();
      await db.exec("ROLLBACK");
      expect((await db.query('SELECT "role_id" FROM "Employee"')).rows).toEqual([{ role_id: "custom" }]);
      expect((await db.query(`SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Note' AND column_name = 'updated_at'`)).rows).toEqual([]);
    } finally { await db.close(); }
  }, 30000);

  it("applies the missing transition even when 0004 is already recorded", async () => {
    const db = new PGlite();
    try {
      await db.exec(await migration("0001_init.sql"));
      await db.exec(await migration("0002_business_tenancy.sql"));
      await db.exec(`ALTER TABLE "Note" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now());
        INSERT INTO _migrations (name) VALUES ('0001_init.sql'), ('0002_business_tenancy.sql'), ('0004_schema_update.sql');`);
      await applyMigrations(db);
      expect((await db.query(`SELECT column_default FROM information_schema.columns
        WHERE table_name = 'Note' AND column_name = 'updated_at'`)).rows).toEqual([{ column_default: null }]);
      expect((await db.query("SELECT name FROM _migrations ORDER BY name")).rows).toHaveLength(4);
    } finally { await db.close(); }
  }, 30000);
});
