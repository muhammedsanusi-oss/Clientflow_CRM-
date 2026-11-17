ALTER TABLE "BusinessWebsiteContent"
  ADD COLUMN "richText" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "sectionStyles" JSONB NOT NULL DEFAULT '{}';
