-- Extend the existing announcements CMS record for reusable promotional popups.
ALTER TYPE "PopupFrequency" ADD VALUE IF NOT EXISTS 'ONCE_CUSTOMER';
ALTER TYPE "PopupFrequency" ADD VALUE IF NOT EXISTS 'ALWAYS_UNTIL_CLOSED';

DO $$ BEGIN
  CREATE TYPE "PopupContentType" AS ENUM (
    'PROMOTIONAL_POSTER',
    'OFFER',
    'ANNOUNCEMENT',
    'NEW_ITEM',
    'FESTIVAL_SPECIAL',
    'PRE_ORDER',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PopupCtaType" AS ENUM (
    'ORDER_NOW',
    'PREBOOK_NOW',
    'WHATSAPP',
    'CUSTOM_URL',
    'NONE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PopupAnalyticsEventType" AS ENUM (
    'IMPRESSION',
    'VIEW',
    'CLOSE',
    'CTA_CLICK',
    'WHATSAPP_CLICK',
    'ORDER_CLICK',
    'PREBOOK_CLICK',
    'CONVERSION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "announcements"
  ADD COLUMN IF NOT EXISTS "popupType" "PopupContentType",
  ADD COLUMN IF NOT EXISTS "headline" TEXT,
  ADD COLUMN IF NOT EXISTS "subheadline" TEXT,
  ADD COLUMN IF NOT EXISTS "price" TEXT,
  ADD COLUMN IF NOT EXISTS "availability" TEXT,
  ADD COLUMN IF NOT EXISTS "ctaType" "PopupCtaType",
  ADD COLUMN IF NOT EXISTS "ctaMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "imageOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "closeOnOverlay" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "announcement_analytics"
  ADD COLUMN IF NOT EXISTS "whatsappClicks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "orderClicks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "prebookClicks" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "announcement_analytics_events" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "eventType" "PopupAnalyticsEventType" NOT NULL,
  "sessionId" TEXT,
  "customerId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcement_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "announcement_analytics_events_announcementId_createdAt_idx"
  ON "announcement_analytics_events"("announcementId", "createdAt");
CREATE INDEX IF NOT EXISTS "announcement_analytics_events_announcementId_eventType_createdAt_idx"
  ON "announcement_analytics_events"("announcementId", "eventType", "createdAt");

DO $$ BEGIN
  ALTER TABLE "announcement_analytics_events"
    ADD CONSTRAINT "announcement_analytics_events_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "announcements"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
