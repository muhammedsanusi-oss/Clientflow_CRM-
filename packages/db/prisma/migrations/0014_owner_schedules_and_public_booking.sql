BEGIN;

CREATE TYPE "AppointmentSource" AS ENUM ('INTERNAL', 'PUBLIC');

ALTER TABLE "Appointment"
  ALTER COLUMN "employee_id" DROP NOT NULL,
  ADD COLUMN "bookingStaffId" TEXT,
  ADD COLUMN "source" "AppointmentSource" NOT NULL DEFAULT 'INTERNAL';

CREATE INDEX "Appointment_bookingStaffId_appointment_date_idx"
  ON "Appointment"("bookingStaffId", "appointment_date");

CREATE TABLE "BusinessHoursInterval" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  CONSTRAINT "BusinessHoursInterval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessHoursInterval_businessId_fkey" FOREIGN KEY ("businessId")
    REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BusinessHoursInterval_businessId_dayOfWeek_startTime_key"
  ON "BusinessHoursInterval"("businessId", "dayOfWeek", "startTime");
CREATE INDEX "BusinessHoursInterval_businessId_dayOfWeek_idx"
  ON "BusinessHoursInterval"("businessId", "dayOfWeek");

CREATE TABLE "BookingStaff" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "BookingStaff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingStaff_businessId_fkey" FOREIGN KEY ("businessId")
    REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingStaff_businessId_name_key"
  ON "BookingStaff"("businessId", "name");
CREATE INDEX "BookingStaff_businessId_isActive_idx"
  ON "BookingStaff"("businessId", "isActive");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_bookingStaffId_fkey"
  FOREIGN KEY ("bookingStaffId") REFERENCES "BookingStaff"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment_Service"
  ADD COLUMN "service_name_at_booking" TEXT,
  ADD COLUMN "duration_minutes_at_booking" INTEGER;

UPDATE "Appointment_Service" AS appointment_service
SET "service_name_at_booking" = service.name,
    "duration_minutes_at_booking" = service.duration_minutes
FROM "Service" AS service
WHERE appointment_service."service_id" = service.id;

ALTER TABLE "Appointment_Service"
  ALTER COLUMN "service_name_at_booking" SET NOT NULL,
  ALTER COLUMN "duration_minutes_at_booking" SET NOT NULL;

CREATE TABLE "BookingStaffHours" (
  "id" TEXT NOT NULL,
  "bookingStaffId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  CONSTRAINT "BookingStaffHours_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingStaffHours_bookingStaffId_fkey" FOREIGN KEY ("bookingStaffId")
    REFERENCES "BookingStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingStaffHours_bookingStaffId_dayOfWeek_startTime_key"
  ON "BookingStaffHours"("bookingStaffId", "dayOfWeek", "startTime");
CREATE INDEX "BookingStaffHours_bookingStaffId_dayOfWeek_idx"
  ON "BookingStaffHours"("bookingStaffId", "dayOfWeek");

COMMIT;
