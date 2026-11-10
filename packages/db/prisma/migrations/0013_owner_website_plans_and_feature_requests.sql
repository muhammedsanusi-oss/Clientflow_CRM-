BEGIN;

CREATE TYPE "WebsitePlan" AS ENUM ('FREE', 'PLUS', 'PREMIUM');

ALTER TABLE "Business" ADD COLUMN "websitePlan" "WebsitePlan";

CREATE TABLE "WebsiteFeatureRequest" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteFeatureRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteFeatureRequest_businessId_fkey" FOREIGN KEY ("businessId")
    REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WebsiteFeatureRequest_submittedById_fkey" FOREIGN KEY ("submittedById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "WebsiteFeatureRequest_businessId_createdAt_idx"
  ON "WebsiteFeatureRequest"("businessId", "createdAt");

COMMIT;
