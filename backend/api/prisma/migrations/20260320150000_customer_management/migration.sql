-- Customer Management CRM schema

CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
CREATE TYPE "RewardTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'RESET');

ALTER TABLE "users" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "loyaltyTier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE';
ALTER TABLE "users" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "users" ADD COLUMN "preferredPayment" "PaymentMethod";
ALTER TABLE "users" ADD COLUMN "preferredDelivery" TEXT;
ALTER TABLE "users" ADD COLUMN "lastOrderAt" TIMESTAMP(3);

CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "points" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "type" "RewardTransactionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_rewards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_coupons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_coupons_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_rewards" ADD CONSTRAINT "customer_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_activity" ADD CONSTRAINT "customer_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_coupons" ADD CONSTRAINT "customer_coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_coupons" ADD CONSTRAINT "customer_coupons_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "customer_coupons_userId_couponId_key" ON "customer_coupons"("userId", "couponId");
