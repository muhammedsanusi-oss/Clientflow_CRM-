-- AlterTable
ALTER TABLE "Service" ADD COLUMN "business_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Service_business_id_idx" ON "Service"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "Service_business_id_name_key" ON "Service"("business_id", "name");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
