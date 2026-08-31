-- Hero "Orders Delivered" stat: 5000+ → 1000+
UPDATE "cms_sections"
SET
  content = jsonb_set(
    content,
    '{stats}',
    (
      SELECT COALESCE(
        jsonb_agg(
          CASE
            WHEN elem->>'label' ILIKE '%Orders Delivered%'
            THEN jsonb_set(elem, '{value}', '1000'::jsonb)
            ELSE elem
          END
        ),
        content->'stats'
      )
      FROM jsonb_array_elements(COALESCE(content->'stats', '[]'::jsonb)) AS elem
    )
  ),
  "updatedAt" = NOW()
WHERE "pageKey" = 'home'
  AND "sectionKey" = 'hero'
  AND content ? 'stats';
