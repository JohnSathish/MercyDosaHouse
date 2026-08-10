-- Pre-order discount settings and order breakdown
ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "preOrderDiscountPct" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "preOrderMinDaysAhead" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "preOrderStackWithCoupons" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "preOrderDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;
