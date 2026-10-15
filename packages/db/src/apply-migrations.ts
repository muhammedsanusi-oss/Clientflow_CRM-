// Applies SQL migration files in order via a generic query interface.
// Works with both PGlite (in-process, tests) and pg (server, dev+prod).

import { log } from "@project/log";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

interface Sql {
  exec(sql: string): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "migrations");

async function hasReconciledSchema(sql: Sql): Promise<boolean> {
  const { rows } = await sql.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Employee'
          AND column_name = 'role_id' AND udt_name = 'EmployeeRole'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Appointment'
          AND column_name = 'status_id' AND udt_name = 'AppointmentStatus'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Interaction'
          AND column_name = 'type_id' AND udt_name = 'InteractionType'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Task'
          AND column_name = 'status' AND udt_name = 'TaskStatus'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Note'
          AND column_name = 'updated_at' AND is_nullable = 'NO'
          AND column_default IS NULL
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Employee'
          AND column_name = 'hire_date' AND data_type = 'date'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Employee'
          AND column_name = 'role_id' AND column_default = '''STAFF''::"EmployeeRole"'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Employee'
          AND column_name = 'is_active' AND column_default = 'true'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Appointment'
          AND column_name = 'status_id'
          AND column_default = '''SCHEDULED''::"AppointmentStatus"'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Customer'
          AND column_name = 'updatedAt' AND column_default IS NULL
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Note'
          AND column_name = 'created_at' AND column_default = 'CURRENT_TIMESTAMP'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Task'
          AND column_name = 'created_at' AND column_default = 'CURRENT_TIMESTAMP'
      )
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Payment'
          AND column_name = 'customer_id'
      )
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('Employee_role', 'Interaction_type')
      )
      AND (
        SELECT count(*) = 12 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname IN (
          'Employee_business_id_user_id_key', 'Employee_user_id_idx',
          'Task_employee_id_due_date_idx', 'Task_customer_id_idx',
          'Note_customer_id_note_date_idx',
          'Appointment_customer_id_appointment_date_idx',
          'Appointment_employee_id_appointment_date_idx',
          'Appointment_location_id_appointment_date_idx',
          'Appointment_Service_appointment_id_service_id_key',
          'Appointment_Service_service_id_idx',
          'Interaction_customer_id_interaction_date_idx',
          'Payment_appointment_id_idx'
        )
      )
      AND (
        SELECT count(*) = 9 FROM pg_constraint
        WHERE contype = 'f' AND conname IN (
          'Task_customer_id_fkey', 'Task_employee_id_fkey',
          'Note_customer_id_fkey', 'Note_employee_id_fkey',
          'Appointment_customer_id_fkey', 'Appointment_employee_id_fkey',
          'Interaction_customer_id_fkey', 'Interaction_employee_id_fkey',
          'Payment_appointment_id_fkey'
        )
      )
      AND (
        SELECT count(*) = 3 AND bool_and(enumlabel IN ('OWNER', 'MANAGER', 'STAFF'))
        FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'EmployeeRole'
      )
      AND (
        SELECT count(*) = 5 AND bool_and(enumlabel IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'))
        FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'AppointmentStatus'
      ) AS reconciled
  `);
  const row = rows[0] as { reconciled: boolean } | undefined;
  return row?.reconciled === true;
}

export async function applyMigrations(sql: Sql, info = (msg: string) => {}) {
  // Ensure migrations table exists.
  await sql.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const { readdir } = await import("node:fs/promises");
  let files: string[];
  try {
    files = await readdir(MIGRATIONS_DIR);
  } catch {
    info("no migrations directory — skipping");
    return;
  }

  const sorted = files.filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await sql.query("SELECT name FROM _migrations ORDER BY name");
  const applied = new Set(rows.map((r: unknown) => (r as { name: string }).name));

  for (const file of sorted) {
    if (applied.has(file)) {
      info(`migration ${file} already applied — skipping`);
      continue;
    }
    if (file === "0003_reconcile_schema.sql" && await hasReconciledSchema(sql)) {
      await sql.exec(`INSERT INTO _migrations (name) VALUES ('${file}')`);
      info(`migration ${file} already reflected in schema — recording as applied`);
      continue;
    }
    const { readFile } = await import("node:fs/promises");
    const migration = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
    await sql.exec(migration);
    await sql.exec(`INSERT INTO _migrations (name) VALUES ('${file.replace(/'/g, "''")}')`);
    info(`applied migration ${file}`);
  }
}