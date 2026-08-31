ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "feedbackConfig" JSONB;

CREATE TABLE IF NOT EXISTS "review_moderation_logs" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "adminId" TEXT,
    "adminName" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "review_moderation_logs_reviewId_createdAt_idx"
  ON "review_moderation_logs"("reviewId", "createdAt");

ALTER TABLE "review_moderation_logs" DROP CONSTRAINT IF EXISTS "review_moderation_logs_reviewId_fkey";
ALTER TABLE "review_moderation_logs"
  ADD CONSTRAINT "review_moderation_logs_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
