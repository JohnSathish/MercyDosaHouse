-- Link homepage promotions to live catalog products and their schedule.
ALTER TABLE "announcements" ADD COLUMN "promotionProductId" TEXT;
ALTER TABLE "announcements" ADD COLUMN "promotionDayOfWeek" INTEGER;
ALTER TABLE "announcements" ADD COLUMN "promotionReadyTime" TEXT;
ALTER TABLE "announcements" ADD COLUMN "promotionPreOrderRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "announcements" ADD COLUMN "promotionPreOrderCutoffDay" INTEGER;
ALTER TABLE "announcements" ADD COLUMN "promotionQuantityLimit" INTEGER;
ALTER TABLE "announcements" ADD COLUMN "promotionWebsiteEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "announcements" ADD COLUMN "promotionAndroidEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "announcements_promotionProductId_idx" ON "announcements"("promotionProductId");

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_promotionProductId_fkey"
  FOREIGN KEY ("promotionProductId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Upgrade the existing seeded Chicken Dum Biryani campaign without embedding it in the website.
UPDATE "products"
SET "name" = 'Mercy Special Chicken Dum Biryani',
    "price" = 350,
    "isPreOrder" = true
WHERE "slug" = 'chicken-biryani';

UPDATE "announcements" AS a
SET
  "title" = 'CHICKEN DUM BIRYANI',
  "message" = 'Freshly prepared Chicken Dum Biryani with egg, chicken pieces, onion raita, chicken gravy and a sweet.',
  "shortMessage" = 'Every Sunday • 1:00 PM',
  "ctaText" = 'PRE-ORDER NOW',
  "ctaUrl" = '/checkout?product=chicken-biryani&preorder=1',
  "bannerImageUrl" = COALESCE("bannerImageUrl", '/images/chicken-biryani.png'),
  "heroBannerImageUrl" = COALESCE("heroBannerImageUrl", '/images/chicken-biryani.png'),
  "placements" = ARRAY['HERO_SECTION', 'APP_HOME']::TEXT[],
  "priorityLevel" = 'PROMOTION',
  "priority" = 100,
  "status" = 'PUBLISHED',
  "isActive" = true,
  "publishedAt" = COALESCE("publishedAt", NOW()),
  "promotionProductId" = (SELECT p."id" FROM "products" AS p WHERE p."slug" = 'chicken-biryani' LIMIT 1),
  "promotionDayOfWeek" = 0,
  "promotionReadyTime" = '13:00',
  "promotionPreOrderRequired" = true,
  "promotionPreOrderCutoffDay" = 6,
  "promotionWebsiteEnabled" = true,
  "promotionAndroidEnabled" = true
WHERE a."title" ILIKE '%chicken%biriyani%'
   OR a."title" ILIKE '%chicken%biryani%';
