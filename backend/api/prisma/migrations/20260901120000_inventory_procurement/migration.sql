DO $$ BEGIN
  ALTER TYPE "InventoryUnit" ADD VALUE 'BOX';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'RECIPE_USAGE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'STOCK_IN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'STOCK_OUT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'RETURN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'REVERSAL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'ORDERED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'PARTIALLY_RECEIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "WasteReason" ADD VALUE 'SPOILAGE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "WasteReason" ADD VALUE 'COOKING_LOSS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "WasteReason" ADD VALUE 'OVERPRODUCTION';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "WasteReason" ADD VALUE 'OTHER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "whatsapp" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "ifsc" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "inventory_items"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "purchase_orders"
  ADD COLUMN IF NOT EXISTS "expectedDeliveryDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "supplierRef" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT,
  ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "otherCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

UPDATE "purchase_orders" SET "status" = 'ORDERED' WHERE "status" IN ('SENT', 'APPROVED');

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_consumption_orderId_itemId_key"
  ON "inventory_consumption"("orderId", "itemId");
CREATE INDEX IF NOT EXISTS "inventory_consumption_orderId_idx" ON "inventory_consumption"("orderId");
CREATE INDEX IF NOT EXISTS "stock_movements_itemId_createdAt_idx" ON "stock_movements"("itemId", "createdAt");

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'INVENTORY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "InventoryUnit" ADD VALUE 'CUSTOM';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockAdjustmentReason" ADD VALUE 'RETURN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockAdjustmentReason" ADD VALUE 'TRANSFER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "inventory_items"
  ADD COLUMN IF NOT EXISTS "customUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "lotNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "autoMenuAvailability" BOOLEAN NOT NULL DEFAULT false;
