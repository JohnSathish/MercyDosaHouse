-- Ensure APP10 exists for the Android app (10% off, min ₹99).
INSERT INTO coupons (
  id,
  code,
  name,
  description,
  type,
  value,
  "minOrderAmount",
  "maxDiscount",
  "isActive",
  "usageCount",
  "appliesTo",
  "usageMode",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'APP10',
  'App Exclusive 10% OFF',
  '10% OFF on the Mercy Dosa House Android app. Min ₹99, max ₹100.',
  'PERCENTAGE',
  10,
  99,
  100,
  true,
  0,
  'ANDROID',
  'EVERY_ORDER',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'APP10');

-- Make APP10 usable on the current app even if channel detection is missing.
UPDATE coupons
SET
  "isActive" = true,
  "appliesTo" = 'ALL',
  "usageMode" = 'EVERY_ORDER',
  "minOrderAmount" = 99,
  "maxDiscount" = COALESCE("maxDiscount", 100),
  "updatedAt" = NOW()
WHERE code = 'APP10';
