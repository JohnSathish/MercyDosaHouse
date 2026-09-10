-- Restore Idly on the live menu: 5 pieces for ₹70.
-- Admin soft-delete rewrites slugs to "<slug>-deleted-<timestamp>", so revive one
-- matching row when possible, otherwise insert a fresh product.

UPDATE "products"
SET
  "name" = 'Idly (5 Pieces)',
  "slug" = 'idli-4-pieces',
  "description" = 'Soft & fluffy steamed rice cakes. Five pieces, served with sambar and chutney.',
  "price" = 70,
  "packingCharge" = 10,
  "imageUrl" = COALESCE("imageUrl", '/images/idli-4-pieces.png'),
  "isAvailable" = true,
  "isComingSoon" = false,
  "isPopular" = true,
  "deletedAt" = NULL,
  "categoryId" = COALESCE(
    (SELECT "id" FROM "categories" WHERE "slug" = 'idly' LIMIT 1),
    "categoryId"
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = (
  SELECT "id"
  FROM "products"
  WHERE
    "slug" IN ('idli-4-pieces', 'idli-5-pieces', 'idly-5-pieces')
    OR "slug" LIKE 'idli-4-pieces-deleted%'
    OR "slug" LIKE 'idli-5-pieces-deleted%'
    OR (
      ("name" ILIKE '%idli%' OR "name" ILIKE '%idly%')
      AND "deletedAt" IS NOT NULL
    )
  ORDER BY
    CASE WHEN "slug" = 'idli-4-pieces' THEN 0 ELSE 1 END,
    "updatedAt" DESC
  LIMIT 1
);

INSERT INTO "products" (
  "id",
  "name",
  "slug",
  "description",
  "price",
  "packingCharge",
  "imageUrl",
  "categoryId",
  "foodType",
  "spiceLevel",
  "prepTimeMinutes",
  "isAvailable",
  "isPopular",
  "isFeatured",
  "isBestseller",
  "isOnOffer",
  "isPreOrder",
  "isComingSoon",
  "ingredients",
  "createdAt",
  "updatedAt"
)
SELECT
  '8f3c2e91-4d6a-4b8e-9c1f-01d15e500001',
  'Idly (5 Pieces)',
  'idli-4-pieces',
  'Soft & fluffy steamed rice cakes. Five pieces, served with sambar and chutney.',
  70,
  10,
  '/images/idli-4-pieces.png',
  c."id",
  'VEG',
  'MILD',
  8,
  true,
  true,
  false,
  false,
  false,
  false,
  false,
  'Served with Sambar, Coconut Chutney & Tomato Chutney',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "categories" c
WHERE c."slug" = 'idly'
  AND NOT EXISTS (
    SELECT 1 FROM "products" WHERE "slug" = 'idli-4-pieces'
  );
