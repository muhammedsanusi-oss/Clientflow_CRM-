-- Restore the missing transition required by 0004. Unknown legacy values
-- abort the transaction so they can be reconciled without losing data.
BEGIN;

CREATE TYPE "EmployeeRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW');

ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_role_id_fkey";
UPDATE "Employee" e SET "role_id" = upper(trim(r."name"))
FROM "Employee_role" r WHERE e."role_id" = r."id";
ALTER TABLE "Employee" ALTER COLUMN "role_id" TYPE "EmployeeRole" USING upper(trim("role_id"))::"EmployeeRole";
ALTER TABLE "Employee" ALTER COLUMN "role_id" SET DEFAULT 'STAFF';
ALTER TABLE "Employee" ALTER COLUMN "is_active" SET DEFAULT true;
ALTER TABLE "Employee" ALTER COLUMN "hire_date" TYPE DATE USING "hire_date"::date;
DROP INDEX IF EXISTS "Employee_user_id_key";
CREATE UNIQUE INDEX "Employee_business_id_user_id_key" ON "Employee"("business_id", "user_id");
CREATE INDEX "Employee_user_id_idx" ON "Employee"("user_id");

ALTER TABLE "Interaction" DROP CONSTRAINT IF EXISTS "Interaction_type_id_fkey";
UPDATE "Interaction" i SET "type_id" = upper(trim(t."name"))
FROM "Interaction_type" t WHERE i."type_id" = t."id";
ALTER TABLE "Interaction" ALTER COLUMN "type_id" TYPE "InteractionType" USING upper(trim("type_id"))::"InteractionType";
ALTER TABLE "Appointment" ALTER COLUMN "status_id" TYPE "AppointmentStatus" USING upper(trim("status_id"))::"AppointmentStatus";
ALTER TABLE "Appointment" ALTER COLUMN "status_id" SET DEFAULT 'SCHEDULED';

ALTER TABLE "Customer" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Task" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Task" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
UPDATE "Note" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "Note" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "Note" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "Note" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- Preserve lookup-table history outside the active public schema.
CREATE SCHEMA IF NOT EXISTS legacy;
ALTER TABLE "Employee_role" SET SCHEMA legacy;
ALTER TABLE "Interaction_type" SET SCHEMA legacy;

-- Customer is derivable from the appointment; abort if legacy rows disagree.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Payment" p JOIN "Appointment" a ON a."id" = p."appointment_id"
             WHERE p."customer_id" <> a."customer_id") THEN
    RAISE EXCEPTION 'Payment customer differs from appointment customer; reconcile before migrating';
  END IF;
END $$;
ALTER TABLE "Payment" DROP COLUMN "customer_id";

CREATE INDEX "Task_employee_id_due_date_idx" ON "Task"("employee_id", "due_date");
CREATE INDEX "Task_customer_id_idx" ON "Task"("customer_id");
CREATE INDEX "Note_customer_id_note_date_idx" ON "Note"("customer_id", "note_date");
CREATE INDEX "Appointment_customer_id_appointment_date_idx" ON "Appointment"("customer_id", "appointment_date");
CREATE INDEX "Appointment_employee_id_appointment_date_idx" ON "Appointment"("employee_id", "appointment_date");
CREATE INDEX "Appointment_location_id_appointment_date_idx" ON "Appointment"("location_id", "appointment_date");
CREATE UNIQUE INDEX "Appointment_Service_appointment_id_service_id_key" ON "Appointment_Service"("appointment_id", "service_id");
CREATE INDEX "Appointment_Service_service_id_idx" ON "Appointment_Service"("service_id");
CREATE INDEX "Interaction_customer_id_interaction_date_idx" ON "Interaction"("customer_id", "interaction_date");
CREATE INDEX "Payment_appointment_id_idx" ON "Payment"("appointment_id");

ALTER TABLE "Task" DROP CONSTRAINT "Task_customer_id_fkey", DROP CONSTRAINT "Task_employee_id_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" DROP CONSTRAINT "Note_customer_id_fkey", DROP CONSTRAINT "Note_employee_id_fkey";
ALTER TABLE "Note" ADD CONSTRAINT "Note_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_customer_id_fkey", DROP CONSTRAINT "Appointment_employee_id_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_customer_id_fkey", DROP CONSTRAINT "Interaction_employee_id_fkey";
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_appointment_id_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
