-- CreateEnum
CREATE TYPE "AnnouncementPriorityLevel" AS ENUM ('EMERGENCY', 'DELIVERY_UPDATE', 'IMPORTANT_NOTICE', 'PROMOTION', 'GENERAL');
CREATE TYPE "AnnouncementPlatform" AS ENUM ('WEBSITE', 'ANDROID', 'BOTH');
CREATE TYPE "PopupFrequency" AS ENUM ('ONCE_SESSION', 'ONCE_DAY', 'EVERY_VISIT');
CREATE TYPE "DeliveryAvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED_AREA', 'TEMPORARILY_UNAVAILABLE', 'COMING_SOON');

-- AlterTable announcements
ALTER TABLE "announcements" ADD COLUMN "shortMessage" TEXT;
ALTER TABLE "announcements" ADD COLUMN "icon" TEXT;
ALTER TABLE "announcements" ADD COLUMN "bannerImageUrl" TEXT;
ALTER TABLE "announcements" ADD COLUMN "heroBannerImageUrl" TEXT;
ALTER TABLE "announcements" ADD COLUMN "ctaText" TEXT;
ALTER TABLE "announcements" ADD COLUMN "ctaUrl" TEXT;
ALTER TABLE "announcements" ADD COLUMN "dailyStartTime" TEXT;
ALTER TABLE "announcements" ADD COLUMN "dailyEndTime" TEXT;
ALTER TABLE "announcements" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "announcements" ADD COLUMN "priorityLevel" "AnnouncementPriorityLevel" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "announcements" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "announcements" ADD COLUMN "dismissible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "announcements" ADD COLUMN "mandatory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "announcements" ADD COLUMN "platform" "AnnouncementPlatform" NOT NULL DEFAULT 'BOTH';
ALTER TABLE "announcements" ADD COLUMN "placements" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "announcements" ADD COLUMN "orderTypes" TEXT[] DEFAULT ARRAY['ALL']::TEXT[];
ALTER TABLE "announcements" ADD COLUMN "popupFrequency" "PopupFrequency";
ALTER TABLE "announcements" ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "announcements" SET "status" = 'PUBLISHED', "publishedAt" = NOW() WHERE "isActive" = true;

-- CreateTable delivery_config
CREATE TABLE "delivery_config" (
    "id" TEXT NOT NULL,
    "status" "DeliveryAvailabilityStatus" NOT NULL DEFAULT 'LIMITED_AREA',
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orderStartTime" TEXT,
    "orderEndTime" TEXT,
    "deliveryStartTime" TEXT,
    "deliveryEndTime" TEXT,
    "deliveryCharge" DECIMAL(10,2),
    "freeDeliveryThreshold" DECIMAL(10,2),
    "minOrderAmount" DECIMAL(10,2),
    "message" TEXT,
    "expansionMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable announcement_analytics
CREATE TABLE "announcement_analytics" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "dismissals" INTEGER NOT NULL DEFAULT 0,
    "ctaClicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "websiteViews" INTEGER NOT NULL DEFAULT 0,
    "androidViews" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "announcement_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable announcement_dismissals
CREATE TABLE "announcement_dismissals" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'WEBSITE',
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcement_dismissals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "announcement_analytics_announcementId_key" ON "announcement_analytics"("announcementId");
CREATE UNIQUE INDEX "announcement_dismissals_announcementId_sessionId_key" ON "announcement_dismissals"("announcementId", "sessionId");

ALTER TABLE "announcement_analytics" ADD CONSTRAINT "announcement_analytics_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
