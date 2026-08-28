-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_ORDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_PLACED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "notificationConfig" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_dispatches" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_dispatches_dedupeKey_key" ON "push_dispatches"("dedupeKey");
