-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE IF NOT EXISTS 'ANDROID';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CouponAppliesTo" AS ENUM ('ALL', 'WEBSITE', 'ANDROID', 'SPECIFIC_CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CouponUsageMode" AS ENUM ('EVERY_ORDER', 'FIRST_ORDER', 'FIRST_APP_ORDER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "appliesTo" "CouponAppliesTo" NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "usageMode" "CouponUsageMode" NOT NULL DEFAULT 'EVERY_ORDER';

ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "appPromoConfig" JSONB;
