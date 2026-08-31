-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REPLY';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
CREATE TYPE "ReviewVisibility" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');

-- AlterTable
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "likes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "visibility" "ReviewVisibility" NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN IF NOT EXISTS "flagged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "needsAttention" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "adminReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ownerRepliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ownerRepliedById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_orderId_key" ON "reviews"("orderId");
CREATE INDEX IF NOT EXISTS "reviews_visibility_createdAt_idx" ON "reviews"("visibility", "createdAt");
CREATE INDEX IF NOT EXISTS "reviews_rating_idx" ON "reviews"("rating");
CREATE INDEX IF NOT EXISTS "reviews_userId_createdAt_idx" ON "reviews"("userId", "createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "review_items" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_orderId_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_items" DROP CONSTRAINT IF EXISTS "review_items_reviewId_fkey";
ALTER TABLE "review_items"
  ADD CONSTRAINT "review_items_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_items" DROP CONSTRAINT IF EXISTS "review_items_orderItemId_fkey";
ALTER TABLE "review_items"
  ADD CONSTRAINT "review_items_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "review_items" DROP CONSTRAINT IF EXISTS "review_items_productId_fkey";
ALTER TABLE "review_items"
  ADD CONSTRAINT "review_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
