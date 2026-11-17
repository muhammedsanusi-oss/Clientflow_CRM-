-- Empty overrides preserve existing template and typography colors.
ALTER TABLE "BusinessWebsiteContent"
  ADD COLUMN "colors" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "colorSwatches" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
