BEGIN;
ALTER TABLE "BusinessWebsiteContent"
  ADD COLUMN "sectionImages" JSONB NOT NULL DEFAULT '{"header":[],"hero":[],"features":[],"about":[],"offerings":[],"contact":[]}'::jsonb;

UPDATE "BusinessWebsiteContent"
SET "sectionImages" = jsonb_build_object(
  'header', CASE WHEN "logoImage" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array("logoImage") END,
  'hero', CASE WHEN "heroImage" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array("heroImage") END,
  'features', '[]'::jsonb,
  'about', '[]'::jsonb,
  'offerings', '[]'::jsonb,
  'contact', '[]'::jsonb
),
"additionalSections" = COALESCE((
  SELECT jsonb_agg(
    CASE WHEN jsonb_typeof(section.value->'images') = 'array'
      THEN section.value
      ELSE section.value || jsonb_build_object('images', '[]'::jsonb)
    END ORDER BY section.ordinality
  )
  FROM jsonb_array_elements("BusinessWebsiteContent"."additionalSections")
    WITH ORDINALITY AS section(value, ordinality)
), '[]'::jsonb);
COMMIT;
