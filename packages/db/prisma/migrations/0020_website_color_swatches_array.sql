-- Prisma scalar lists use nullable PostgreSQL array columns with an empty default.
-- Keep the already-applied color migration intact and align its catalog here.
ALTER TABLE "BusinessWebsiteContent" ALTER COLUMN "colorSwatches" DROP NOT NULL;
