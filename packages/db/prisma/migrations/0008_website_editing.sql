BEGIN;
CREATE TABLE "BusinessWebsiteContent" (
  "businessId" TEXT PRIMARY KEY REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eyebrow" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "sectionTitle" TEXT NOT NULL,
  "buttonLabel" TEXT NOT NULL,
  "features" TEXT[],
  "offerings" TEXT[],
  "version" INTEGER NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "BusinessWebsiteRevision" (
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "publishedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  PRIMARY KEY ("businessId", "version")
);
COMMIT;
