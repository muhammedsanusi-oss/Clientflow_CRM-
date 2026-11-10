BEGIN;
ALTER TABLE "BusinessWebsiteContent"
  ADD COLUMN "aboutText" TEXT NOT NULL DEFAULT '';

UPDATE "BusinessWebsiteContent" AS content
SET "aboutText" = business."description"
FROM "Business" AS business
WHERE business."id" = content."businessId";
COMMIT;
