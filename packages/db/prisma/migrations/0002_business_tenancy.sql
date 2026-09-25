-- DropForeignKey
ALTER TABLE "Customer_Business" DROP CONSTRAINT "Customer_Business_customer_id_fkey";

-- DropIndex
DROP INDEX "Customer_address_key";

-- DropIndex
DROP INDEX "Customer_email_key";

-- DropIndex
DROP INDEX "Customer_phone_number_key";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "location_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "business_id" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "business_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "Company_or_Location";

-- DropTable
DROP TABLE "Customer_Business";


-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX "Location_business_id_idx" ON "Location"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "Location_business_id_name_key" ON "Location"("business_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_business_id_address_key" ON "Location"("business_id", "address");

-- CreateIndex
CREATE INDEX "Customer_business_id_last_name_first_name_idx" ON "Customer"("business_id", "last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_business_id_phone_number_key" ON "Customer"("business_id", "phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_business_id_email_key" ON "Customer"("business_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_user_id_key" ON "Employee"("user_id");

-- CreateIndex
CREATE INDEX "Employee_business_id_idx" ON "Employee"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_business_id_email_key" ON "Employee"("business_id", "email");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
