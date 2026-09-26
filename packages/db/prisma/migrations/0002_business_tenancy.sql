BEGIN;

CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Business" ("id", "name", "business_type", "phone_number", "email", "created_at", "updated_at")
SELECT
    'legacy-business',
    COALESCE((SELECT "name" FROM "Company_or_Location" ORDER BY "id" LIMIT 1), 'Legacy Business'),
    COALESCE((SELECT "business_type" FROM "Company_or_Location" ORDER BY "id" LIMIT 1), 'OTHER'::"BusinessType"),
    COALESCE((SELECT "phone_number" FROM "Company_or_Location" ORDER BY "id" LIMIT 1), ''),
    COALESCE((SELECT "email" FROM "Company_or_Location" ORDER BY "id" LIMIT 1), ''),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP;

INSERT INTO "Location" ("id", "business_id", "name", "phone_number", "email", "address", "is_active", "created_at", "updated_at")
SELECT "id", 'legacy-business', "name", "phone_number", "email", "address", true, "created_at", CURRENT_TIMESTAMP
FROM "Company_or_Location";

INSERT INTO "Location" ("id", "business_id", "name", "address", "is_active", "created_at", "updated_at")
SELECT 'legacy-default-location', 'legacy-business', 'Default location', '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Location");

ALTER TABLE "Customer" ADD COLUMN "business_id" TEXT NOT NULL DEFAULT 'legacy-business';
ALTER TABLE "Customer" ALTER COLUMN "business_id" DROP DEFAULT;

ALTER TABLE "Employee" ADD COLUMN "business_id" TEXT NOT NULL DEFAULT 'legacy-business';
ALTER TABLE "Employee" ALTER COLUMN "business_id" DROP DEFAULT;
ALTER TABLE "Employee" ADD COLUMN "user_id" TEXT;

INSERT INTO "User" ("id", "username")
SELECT 'legacy-employee-' || "id", 'legacy-employee-' || "id"
FROM "Employee";

UPDATE "Employee" SET "user_id" = 'legacy-employee-' || "id";
ALTER TABLE "Employee" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "Service" ADD COLUMN "business_id" TEXT NOT NULL DEFAULT 'legacy-business';
ALTER TABLE "Service" ALTER COLUMN "business_id" DROP DEFAULT;

ALTER TABLE "Appointment" ADD COLUMN "location_id" TEXT;
UPDATE "Appointment"
SET "location_id" = (
    SELECT "id" FROM "Location"
    WHERE "business_id" = 'legacy-business'
    ORDER BY "id"
    LIMIT 1
);
ALTER TABLE "Appointment" ALTER COLUMN "location_id" SET NOT NULL;

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "Customer_phone_number_key";
DROP INDEX "Customer_email_key";
DROP INDEX "Customer_address_key";

CREATE UNIQUE INDEX "Customer_business_id_phone_number_key" ON "Customer"("business_id", "phone_number");
CREATE UNIQUE INDEX "Customer_business_id_email_key" ON "Customer"("business_id", "email");
CREATE INDEX "Customer_business_id_last_name_first_name_idx" ON "Customer"("business_id", "last_name", "first_name");
CREATE UNIQUE INDEX "Employee_user_id_key" ON "Employee"("user_id");
CREATE UNIQUE INDEX "Employee_business_id_email_key" ON "Employee"("business_id", "email");
CREATE INDEX "Employee_business_id_idx" ON "Employee"("business_id");
CREATE UNIQUE INDEX "Service_business_id_name_key" ON "Service"("business_id", "name");
CREATE INDEX "Service_business_id_idx" ON "Service"("business_id");
CREATE UNIQUE INDEX "Location_business_id_name_key" ON "Location"("business_id", "name");
CREATE UNIQUE INDEX "Location_business_id_address_key" ON "Location"("business_id", "address");
CREATE INDEX "Location_business_id_idx" ON "Location"("business_id");

DROP TABLE "Customer_Business";
DROP TABLE "Company_or_Location";

COMMIT;
