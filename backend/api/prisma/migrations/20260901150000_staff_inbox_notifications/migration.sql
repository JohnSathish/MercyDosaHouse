DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_PENDING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'REFUND'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'INVENTORY_OUT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'INVENTORY_EXPIRY'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_ORDER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'REVIEW'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'CUSTOMER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'SECURITY'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "eventKey" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'ORDER';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "referenceType" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

UPDATE "notifications" SET "eventKey" = 'legacy:' || "id" WHERE "eventKey" IS NULL;
ALTER TABLE "notifications" ALTER COLUMN "eventKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_eventKey_key" ON "notifications"("eventKey");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_category_createdAt_idx" ON "notifications"("category", "createdAt");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newOrders" BOOLEAN NOT NULL DEFAULT true,
    "orderStatus" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT true,
    "lowStock" BOOLEAN NOT NULL DEFAULT true,
    "expiryAlerts" BOOLEAN NOT NULL DEFAULT true,
    "customerFeedback" BOOLEAN NOT NULL DEFAULT true,
    "deliveryAlerts" BOOLEAN NOT NULL DEFAULT true,
    "systemAlerts" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newOrderSound" BOOLEAN NOT NULL DEFAULT true,
    "vibration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_key" ON "notification_preferences"("userId");

DO $$ BEGIN
  ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
