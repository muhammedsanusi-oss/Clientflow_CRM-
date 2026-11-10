/*
 * Code guide: packages/db/tests/migrations.test.ts
 * Automated regression tests for SQL migration contract. Assertions document expected behavior and failure
 * cases; inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than changing the
 * running local project data.
 */
/*
 * Import connection: vitest.
 * Test runner assertions, lifecycle hooks, spies, and mocks. This import is test support, not a production
 * API.
 * describe: Groups related regression scenarios in the test runner.
 * it: Defines a scenario whose assertions must pass.
 * expect: Checks actual values or failures against the expected behavior.
 */
import { describe, it, expect } from "vitest";
/*
 * Import connection: @electric-sql/pglite.
 * Embedded PostgreSQL-compatible WASM engine used by disposable tests instead of the real TCP database.
 */
import { PGlite } from "@electric-sql/pglite";
/*
 * Import connection: node:fs/promises.
 * Promise-based local filesystem access, primarily reading migration files or a local compiled action
 * manifest in these modules.
 */
import { readFile } from "node:fs/promises";
/*
 * Import connection: node:child_process.
 * Runs a local child command; migration tests use the Prisma CLI to compare generated schema SQL.
 */
import { execFileSync } from "node:child_process";
/*
 * Import connection: node:module.
 * Creates a Node-native module loader so generated Prisma/WASM or package-relative tools resolve from the
 * intended directory.
 */
import { createRequire } from "node:module";
/*
 * Import connection: node:url.
 * Converts module file URLs into local paths so file lookup is relative to the module rather than the
 * terminal directory.
 */
import { fileURLToPath } from "node:url";
/*
 * Import connection: ../src/apply-migrations -> packages/db/src/apply-migrations.ts.
 * applyMigrations: Reads numbered SQL files in filename order, skips recorded migrations, and records
 * successful applications. It never rewrites migration files.
 */
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
  it("adds managed-service storage without changing subscriptions, websites, or CRM data", async () => {
    const db = new PGlite();
    try {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(new URL("../prisma/migrations/", import.meta.url)))
        .filter(file => file.endsWith(".sql") && file < "0018_").sort();
      for (const file of files) await db.exec(await migration(file));
      await db.exec(`INSERT INTO "Business" ("id", "name", "business_type", "phone_number", "email", "updated_at", "websiteTemplate")
        VALUES ('managed-preserve', 'Existing website', 'OTHER', '2125550111', 'preserve@example.test', CURRENT_TIMESTAMP, 'CONTACT');
        INSERT INTO "DemoSubscription" ("businessId", "plan", "status", "updatedAt")
        VALUES ('managed-preserve', 'MANAGED', 'ACTIVE', CURRENT_TIMESTAMP);`);
      const before = (await db.query('SELECT * FROM "Business" ORDER BY "id"')).rows;
      const subscriptions = (await db.query('SELECT * FROM "DemoSubscription"')).rows;
      const customers = (await db.query('SELECT * FROM "Customer" ORDER BY "id"')).rows;
      await db.exec(await migration("0018_managed_service.sql"));
      expect((await db.query('SELECT * FROM "Business" ORDER BY "id"')).rows).toEqual(before);
      expect((await db.query('SELECT * FROM "DemoSubscription"')).rows).toEqual(subscriptions);
      expect((await db.query('SELECT * FROM "Customer" ORDER BY "id"')).rows).toEqual(customers);
      expect((await db.query('SELECT * FROM "ManagedServiceRequest"')).rows).toEqual([]);
      expect((await db.query('SELECT * FROM "ManagedServiceTime"')).rows).toEqual([]);
      expect((await db.query('SELECT * FROM "ManagedServiceEvent"')).rows).toEqual([]);
    } finally { await db.close(); }
  }, 30_000);
  it("adds demo billing without enrolling or changing existing businesses and customers", async () => {
    const db = new PGlite();
    try {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(new URL("../prisma/migrations/", import.meta.url)))
        .filter(file => file.endsWith(".sql") && file < "0017_").sort();
      for (const file of files) await db.exec(await migration(file));
      await db.exec(`INSERT INTO "Business" ("id", "name", "business_type", "phone_number", "email", "updated_at", "websitePlan")
        VALUES ('billing-legacy-business', 'Preserved', 'OTHER', '2125550111', 'legacy@example.test', CURRENT_TIMESTAMP, 'PLUS');
        INSERT INTO "Customer" ("id", "business_id", "first_name", "last_name", "phone_number", "email", "address", "preferred_contact_method", "updatedAt")
        VALUES ('billing-legacy-customer', 'billing-legacy-business', 'Keep', 'Customer', '2125550111', 'customer@example.test', 'Main Street', 'EMAIL', CURRENT_TIMESTAMP);`);
      const businesses = (await db.query('SELECT * FROM "Business"')).rows;
      const customers = (await db.query('SELECT * FROM "Customer"')).rows;
      await db.exec(await migration("0017_demo_subscriptions.sql"));
      expect((await db.query('SELECT * FROM "Business"')).rows).toEqual(businesses);
      expect((await db.query('SELECT * FROM "Customer"')).rows).toEqual(customers);
      expect((await db.query('SELECT * FROM "DemoSubscription"')).rows).toEqual([]);
      expect((await db.query('SELECT * FROM "DemoSubscriptionEvent"')).rows).toEqual([]);
    } finally { await db.close(); }
  }, 30_000);
  it("preserves existing leads and pending owners when callback and setup fields are added", async () => {
    const db = new PGlite();
    try {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(new URL("../prisma/migrations/", import.meta.url)))
        .filter(file => file.endsWith(".sql") && file < "0016_").sort();
      for (const file of files) await db.exec(await migration(file));
      await db.exec(`INSERT INTO "CustomCrmRequest" ("id", "name", "email", "description")
        VALUES ('legacy-lead', 'Existing owner', 'existing@example.test', 'Keep this request');
        INSERT INTO "User" ("id", "email", "passwordHash", "mustChangePassword")
        VALUES ('legacy-pending', 'pending@example.test', 'preserved-hash', true);`);
      await db.exec(await migration("0016_custom_signup_callback_and_setup.sql"));
      expect((await db.query('SELECT "description", "phone", "callbackAt", "callbackTimeZone" FROM "CustomCrmRequest"')).rows)
        .toEqual([{ description: "Keep this request", phone: null, callbackAt: null, callbackTimeZone: null }]);
      expect((await db.query('SELECT "passwordHash", "mustChangePassword", "setupTokenHash" FROM "User"')).rows)
        .toEqual([{ passwordHash: "preserved-hash", mustChangePassword: true, setupTokenHash: null }]);
    } finally { await db.close(); }
  }, 30_000);

  it.each([
    ["0001_init.sql", "Customer"],
    ["0002_business_tenancy.sql", "Business"],
  ])("rolls back %s when its ledger write fails and can retry", async (file, table) => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now());
        CREATE FUNCTION reject_migration_entry() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.name = '${file}' THEN RAISE EXCEPTION 'injected ledger failure'; END IF;
          RETURN NEW;
        END $$;
        CREATE TRIGGER reject_migration BEFORE INSERT ON _migrations
          FOR EACH ROW EXECUTE FUNCTION reject_migration_entry();
      `);
      await expect(applyMigrations(db)).rejects.toThrow("injected ledger failure");
      expect((await db.query(`SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${table}'`)).rows).toEqual([]);
      expect((await db.query("SELECT name FROM _migrations WHERE name = $1", [file])).rows).toEqual([]);
      await db.exec("DROP TRIGGER reject_migration ON _migrations; DROP FUNCTION reject_migration_entry();");
      await applyMigrations(db);
      await applyMigrations(db);
      expect((await db.query("SELECT name FROM _migrations ORDER BY name")).rows).toHaveLength(18);
    } finally { await db.close(); }
  }, 30_000);

  it("backfills existing appointment service names and durations before enabling public bookings", async () => {
    const db = new PGlite();
    try {
      for (const file of [
        "0001_init.sql", "0002_business_tenancy.sql", "0003_reconcile_schema.sql",
        "0004_schema_update.sql", "0005_github_auth.sql", "0006_owner_provisioning.sql",
        "0007_website_templates.sql", "0008_website_editing.sql",
        "0009_website_visual_customization.sql", "0010_website_section_images.sql",
        "0011_website_about_text.sql", "0012_owner_billing_address.sql",
        "0013_owner_website_plans_and_feature_requests.sql",
      ]) await db.exec(await migration(file));
      await db.exec(`
        INSERT INTO "Business" ("id", "name", "business_type", "phone_number", "email", "updated_at")
        VALUES ('booking-business', 'Booking business', 'OTHER', '555-1000', 'owner@example.test', CURRENT_TIMESTAMP);
        INSERT INTO "User" ("id", "username") VALUES ('booking-user', 'booking-user');
        INSERT INTO "Employee" ("id", "business_id", "user_id", "first_name", "last_name", "email", "phone_number", "hire_date")
        VALUES ('booking-employee', 'booking-business', 'booking-user', 'Ada', 'Owner', 'employee@example.test', '555-1001', '2025-01-01');
        INSERT INTO "Customer" ("id", "business_id", "first_name", "last_name", "phone_number", "email", "address", "preferred_contact_method", "updatedAt")
        VALUES ('booking-customer', 'booking-business', 'Grace', 'Customer', '555-1002', 'customer@example.test', 'Main Street', 'EMAIL', CURRENT_TIMESTAMP);
        INSERT INTO "Location" ("id", "business_id", "name", "address", "updated_at")
        VALUES ('booking-location', 'booking-business', 'Main', '1 Main Street', CURRENT_TIMESTAMP);
        INSERT INTO "Service" ("id", "business_id", "name", "category", "description", "duration_minutes", "base_price", "is_Active")
        VALUES ('booking-service', 'booking-business', 'Consultation', 'General', 'Initial service', 45, 50, true);
        INSERT INTO "Appointment" ("id", "customer_id", "employee_id", "location_id", "appointment_date", "start_time", "end_time", "notes", "updated_at")
        VALUES ('booking-appointment', 'booking-customer', 'booking-employee', 'booking-location', '2025-01-01', '2025-01-01 09:00', '2025-01-01 09:45', 'Preserve', CURRENT_TIMESTAMP);
        INSERT INTO "Appointment_Service" ("id", "appointment_id", "service_id", "quantity", "price_at_booking")
        VALUES ('booking-line', 'booking-appointment', 'booking-service', 1, 50);
      `);

      await db.exec(await migration("0014_owner_schedules_and_public_booking.sql"));

      expect((await db.query(`SELECT "source", "employee_id", "bookingStaffId", "notes"
        FROM "Appointment" WHERE "id" = 'booking-appointment'`)).rows).toEqual([{
        source: "INTERNAL",
        employee_id: "booking-employee",
        bookingStaffId: null,
        notes: "Preserve",
      }]);
      expect((await db.query(`SELECT "service_name_at_booking", "duration_minutes_at_booking", "price_at_booking"::float8 AS "price_at_booking"
        FROM "Appointment_Service" WHERE "id" = 'booking-line'`)).rows).toEqual([{
        service_name_at_booking: "Consultation",
        duration_minutes_at_booking: 45,
        price_at_booking: 50,
      }]);
    } finally {
      await db.close();
    }
  }, 30_000);

  it("adds website editing without changing populated sites, credentials, or inquiries", async () => {
    const db = new PGlite();
    try {
      for (const file of ["0001_init.sql", "0002_business_tenancy.sql", "0003_reconcile_schema.sql", "0004_schema_update.sql", "0005_github_auth.sql", "0006_owner_provisioning.sql", "0007_website_templates.sql"]) await db.exec(await migration(file));
      await db.exec(`INSERT INTO "User" ("id", "email", "passwordHash") VALUES ('site-owner', 'owner@example.test', 'preserved-hash');
        INSERT INTO "Business" ("id", "name", "description", "business_type", "phone_number", "email", "websiteTemplate", "updated_at")
        VALUES ('existing-site', 'Existing salon', 'Keep this content', 'SALON', '2125550142', 'public@example.test', 'SALON', CURRENT_TIMESTAMP);
        INSERT INTO "WebsiteInquiry" ("id", "businessId", "name", "email", "message") VALUES ('saved-inquiry', 'existing-site', 'Visitor', 'visitor@example.test', 'Keep this inquiry');`);
      const before = await db.query(`SELECT "id", "name", "description", "business_type", "phone_number", "email",
        "websiteTemplate", "publicAddress", "openingHours", "created_at", "updated_at"
        FROM "Business" WHERE "id" = 'existing-site'`);
      await db.exec(await migration("0008_website_editing.sql"));
      await db.exec(`INSERT INTO "BusinessWebsiteContent"
        ("businessId", "eyebrow", "headline", "sectionTitle", "buttonLabel", "features", "offerings", "version", "publishedById")
        VALUES ('existing-site', 'Welcome', 'A saved headline', 'Our story', 'Contact us',
          ARRAY['Friendly service'], ARRAY['Consultations'], 1, 'site-owner')`);
      const oldContent = await db.query('SELECT "headline", "features", "version" FROM "BusinessWebsiteContent"');
      await db.exec(await migration("0009_website_visual_customization.sql"));
      await db.exec(`UPDATE "BusinessWebsiteContent" SET "logoImage" = 'existing-site/website/logo-12345678-1234-1234-1234-123456789abc.png',
        "heroImage" = 'existing-site/website/hero-12345678-1234-1234-1234-123456789abc.png',
        "additionalSections" = '[{"heading":"Our story","body":"Saved text"}]'::jsonb`);
      await db.exec(await migration("0010_website_section_images.sql"));
      await db.exec(await migration("0011_website_about_text.sql"));
      await db.exec(await migration("0012_owner_billing_address.sql"));
      await db.exec(await migration("0013_owner_website_plans_and_feature_requests.sql"));
      expect((await db.query(`SELECT "id", "name", "description", "business_type", "phone_number", "email",
        "websiteTemplate", "publicAddress", "openingHours", "created_at", "updated_at"
        FROM "Business" WHERE "id" = 'existing-site'`)).rows).toEqual(before.rows);
      expect((await db.query('SELECT "websitePlan" FROM "Business" WHERE "id" = \'existing-site\'')).rows).toEqual([{ websitePlan: null }]);
      expect((await db.query('SELECT "passwordHash" FROM "User" WHERE "id" = \'site-owner\'')).rows).toEqual([{ passwordHash: "preserved-hash" }]);
      expect((await db.query('SELECT "message" FROM "WebsiteInquiry" WHERE "id" = \'saved-inquiry\'')).rows).toEqual([{ message: "Keep this inquiry" }]);
      expect((await db.query('SELECT "headline", "features", "version" FROM "BusinessWebsiteContent"')).rows).toEqual(oldContent.rows);
      expect((await db.query('SELECT "fontFamily", "textColor", "textScale", "additionalSections", "aboutText", "logoImage", "heroImage" FROM "BusinessWebsiteContent"')).rows).toEqual([{
        fontFamily: "SANS", textColor: "INK", textScale: "STANDARD",
        additionalSections: [{ heading: "Our story", body: "Saved text", images: [] }],
        aboutText: "Keep this content",
        logoImage: "existing-site/website/logo-12345678-1234-1234-1234-123456789abc.png",
        heroImage: "existing-site/website/hero-12345678-1234-1234-1234-123456789abc.png",
      }]);
      expect((await db.query('SELECT "sectionImages" FROM "BusinessWebsiteContent"')).rows).toEqual([{
        sectionImages: {
          header: ["existing-site/website/logo-12345678-1234-1234-1234-123456789abc.png"],
          hero: ["existing-site/website/hero-12345678-1234-1234-1234-123456789abc.png"],
          features: [], about: [], offerings: [], contact: [],
        },
      }]);
      expect((await db.query('SELECT * FROM "BusinessWebsiteRevision"')).rows).toEqual([]);
    } finally { await db.close(); }
  }, 30000);

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
      expect((await migrated.query("SELECT name FROM _migrations ORDER BY name")).rows).toHaveLength(18);
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
      // OAuth is an additive migration: legacy identities and membership links survive.
      const usersBefore = (await db.query('SELECT * FROM "User" ORDER BY "id"')).rows;
      const employeesBefore = (await db.query('SELECT * FROM "Employee" ORDER BY "id"')).rows;
      await db.exec(await migration("0005_github_auth.sql"));
      expect((await db.query('SELECT "id", "username", "createdAt" FROM "User" ORDER BY "id"')).rows).toEqual(usersBefore);
      expect((await db.query('SELECT * FROM "Employee" ORDER BY "id"')).rows).toEqual(employeesBefore);
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
      expect((await db.query("SELECT name FROM _migrations ORDER BY name")).rows).toHaveLength(18);
    } finally { await db.close(); }
  }, 30000);

  it("records 0003 without replaying it when its schema changes already exist", async () => {
    const db = new PGlite();
    try {
      await db.exec(await migration("0001_init.sql"));
      await db.exec(await migration("0002_business_tenancy.sql"));
      await db.exec(await migration("0003_reconcile_schema.sql"));
      await db.exec(await migration("0004_schema_update.sql"));
      await db.exec(`DROP SCHEMA legacy CASCADE;
        CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now());
        INSERT INTO _migrations (name) VALUES ('0001_init.sql'), ('0002_business_tenancy.sql'), ('0004_schema_update.sql');`);

      await applyMigrations(db);

      expect((await db.query("SELECT name FROM _migrations ORDER BY name")).rows).toHaveLength(18);
      expect((await db.query(`SELECT udt_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'role_id'`)).rows)
        .toEqual([{ udt_name: "EmployeeRole" }]);
    } finally {
      await db.close();
    }
  }, 30000);
});
