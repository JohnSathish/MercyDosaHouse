-- Category Management System extensions

CREATE TYPE "CategoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'INACTIVE', 'SEASONAL');
CREATE TYPE "CategoryBadge" AS ENUM ('NEW', 'HOT', 'BEST_SELLER', 'LIMITED', 'SPICY', 'VEG', 'NON_VEG');
CREATE TYPE "CategoryImageType" AS ENUM ('BANNER', 'THUMBNAIL', 'CARD', 'MOBILE', 'OG', 'ICON');

ALTER TABLE "categories" ADD COLUMN "icon" TEXT;
ALTER TABLE "categories" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN "mobileImageUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN "cardImageUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN "backgroundColor" TEXT;
ALTER TABLE "categories" ADD COLUMN "textColor" TEXT;
ALTER TABLE "categories" ADD COLUMN "status" "CategoryStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "categories" ADD COLUMN "badge" "CategoryBadge";
ALTER TABLE "categories" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "isSeasonal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "seasonalName" TEXT;
ALTER TABLE "categories" ADD COLUMN "seasonalStart" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN "seasonalEnd" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "showInMobileApp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "showInOffers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "allowOrdering" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "showOnWebsite" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "showOnPos" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "showOnDelivery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "showOnQrMenu" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "gstPercent" DECIMAL(5,2);
ALTER TABLE "categories" ADD COLUMN "prepTimeMinutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "categories" ADD COLUMN "servingTimeMinutes" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "categories" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "categories" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "categories" ADD COLUMN "seoKeywords" TEXT;
ALTER TABLE "categories" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN "ogImageUrl" TEXT;

UPDATE "categories" SET "status" = 'INACTIVE' WHERE "isActive" = false;
UPDATE "categories" SET "status" = 'PUBLISHED' WHERE "isActive" = true;

CREATE TABLE "category_images" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "CategoryImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "category_images_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "category_images" ADD CONSTRAINT "category_images_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_schedule" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "category_schedule_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "category_schedule" ADD CONSTRAINT "category_schedule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_settings" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "category_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "category_settings_categoryId_key" ON "category_settings"("categoryId");
ALTER TABLE "category_settings" ADD CONSTRAINT "category_settings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_analytics" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversion" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "popularity" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "category_analytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "category_analytics_categoryId_key" ON "category_analytics"("categoryId");
ALTER TABLE "category_analytics" ADD CONSTRAINT "category_analytics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_logs" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "category_logs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "category_logs" ADD CONSTRAINT "category_logs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_tags" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    CONSTRAINT "category_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "category_tags_categoryId_tag_key" ON "category_tags"("categoryId", "tag");
ALTER TABLE "category_tags" ADD CONSTRAINT "category_tags_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_banners" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "category_banners_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "category_banners" ADD CONSTRAINT "category_banners_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
