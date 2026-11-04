ALTER TYPE "BusinessType" ADD VALUE 'BAKERY';
CREATE TYPE "WebsiteTemplate" AS ENUM ('BAKERY', 'BARBERSHOP', 'SALON', 'CONTACT');
ALTER TABLE "Business"
  ADD COLUMN "websiteTemplate" "WebsiteTemplate",
  ADD COLUMN "publicAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "openingHours" TEXT NOT NULL DEFAULT '';
CREATE TABLE "WebsiteInquiry" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteInquiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteInquiry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "WebsiteInquiry_businessId_createdAt_idx" ON "WebsiteInquiry"("businessId", "createdAt");
