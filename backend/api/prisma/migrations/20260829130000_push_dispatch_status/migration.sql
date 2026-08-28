ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PICKED_UP';

ALTER TABLE "push_dispatches"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "previousStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "newStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationType" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationId" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "lastError" TEXT,
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "push_dispatches_orderId_createdAt_idx"
  ON "push_dispatches"("orderId", "createdAt");

CREATE INDEX IF NOT EXISTS "push_dispatches_deliveryStatus_createdAt_idx"
  ON "push_dispatches"("deliveryStatus", "createdAt");

DELETE FROM "device_tokens" a
USING "device_tokens" b
WHERE a."token" = b."token"
  AND a."createdAt" < b."createdAt";

CREATE UNIQUE INDEX IF NOT EXISTS "device_tokens_token_key"
  ON "device_tokens"("token");

DELETE FROM "notifications" n
WHERE n."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = n."userId");

CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
