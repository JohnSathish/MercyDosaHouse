-- Central restaurant open/closed status (all customer ordering channels)
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storeOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storeClosedMessage" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storeReopenMessage" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storeClosedReason" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storeStatusChangedAt" TIMESTAMP(3);
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "storeStatusChangedById" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "operatingSchedule" JSONB;
