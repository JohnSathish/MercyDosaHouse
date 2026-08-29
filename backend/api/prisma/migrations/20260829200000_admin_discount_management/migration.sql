-- Upgrade coupons into admin-controlled discounts and preserve immutable order snapshots.
ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "perCustomerUsageLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "startTime" TEXT,
  ADD COLUMN IF NOT EXISTS "endTime" TEXT;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "discountName" TEXT,
  ADD COLUMN IF NOT EXISTS "discountType" "CouponType",
  ADD COLUMN IF NOT EXISTS "discountValue" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "discountId" TEXT;

DO $$ BEGIN
  ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_couponId_fkey";
  ALTER TABLE "orders"
    ADD CONSTRAINT "orders_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "coupon_products" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "coupon_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_products_couponId_productId_key"
  ON "coupon_products"("couponId", "productId");
CREATE INDEX IF NOT EXISTS "coupon_products_productId_idx" ON "coupon_products"("productId");

DO $$ BEGIN
  ALTER TABLE "coupon_products"
    ADD CONSTRAINT "coupon_products_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "coupon_products"
    ADD CONSTRAINT "coupon_products_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "coupon_categories" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "coupon_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_categories_couponId_categoryId_key"
  ON "coupon_categories"("couponId", "categoryId");
CREATE INDEX IF NOT EXISTS "coupon_categories_categoryId_idx" ON "coupon_categories"("categoryId");

DO $$ BEGIN
  ALTER TABLE "coupon_categories"
    ADD CONSTRAINT "coupon_categories_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "coupon_categories"
    ADD CONSTRAINT "coupon_categories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "coupon_customers" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "coupon_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_customers_couponId_userId_key"
  ON "coupon_customers"("couponId", "userId");
CREATE INDEX IF NOT EXISTS "coupon_customers_userId_idx" ON "coupon_customers"("userId");

DO $$ BEGIN
  ALTER TABLE "coupon_customers"
    ADD CONSTRAINT "coupon_customers_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "coupon_customers"
    ADD CONSTRAINT "coupon_customers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Retire legacy promotional records without changing historical order totals.
UPDATE "business_settings" SET "preOrderDiscountPct" = 0;
UPDATE "coupons" SET "isActive" = false WHERE UPPER("code") = 'WELCOME10';
UPDATE "offers" SET "isActive" = false WHERE LOWER("title") IN ('10% off', '10% off ');
ALTER TABLE "business_settings"
  DROP COLUMN IF EXISTS "preOrderDiscountPct",
  DROP COLUMN IF EXISTS "preOrderStackWithCoupons";
