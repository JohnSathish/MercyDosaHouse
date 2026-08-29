-- Add durable retry scheduling for notification dispatches.
ALTER TABLE "push_dispatches"
  ADD COLUMN IF NOT EXISTS "channelId" TEXT,
  ADD COLUMN IF NOT EXISTS "sound" TEXT,
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "push_dispatches_deliveryStatus_nextAttemptAt_idx"
  ON "push_dispatches"("deliveryStatus", "nextAttemptAt");
