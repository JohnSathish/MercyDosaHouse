-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOYALTY';

DO $$ BEGIN
  CREATE TYPE "LoyaltyProgramKey" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LoyaltyTxnType" AS ENUM ('EARN', 'REDEEM', 'REFUND', 'REVERSAL', 'ADMIN_ADJUSTMENT', 'EXPIRY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "loyaltyConfig" JSONB;

CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programKey" "LoyaltyProgramKey" NOT NULL DEFAULT 'BRONZE',
    "available" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "totalExpired" INTEGER NOT NULL DEFAULT 0,
    "totalRefunded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_userId_programKey_key" ON "loyalty_accounts"("userId", "programKey");
CREATE INDEX IF NOT EXISTS "loyalty_accounts_programKey_available_idx" ON "loyalty_accounts"("programKey", "available");

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programKey" "LoyaltyProgramKey" NOT NULL DEFAULT 'BRONZE',
    "orderId" TEXT,
    "type" "LoyaltyTxnType" NOT NULL,
    "coins" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_transactions_reference_key" ON "loyalty_transactions"("reference");
CREATE INDEX IF NOT EXISTS "loyalty_transactions_userId_createdAt_idx" ON "loyalty_transactions"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "loyalty_transactions_orderId_idx" ON "loyalty_transactions"("orderId");
CREATE INDEX IF NOT EXISTS "loyalty_transactions_type_expiresAt_idx" ON "loyalty_transactions"("type", "expiresAt");

DO $$ BEGIN
  ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO "loyalty_accounts" ("id", "userId", "programKey", "available", "pending", "totalEarned", "totalRedeemed", "totalExpired", "totalRefunded", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'BRONZE', u."loyaltyPoints", 0, GREATEST(u."loyaltyPoints", 0), 0, 0, 0, NOW(), NOW()
FROM "users" u
WHERE u."loyaltyPoints" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "loyalty_accounts" a WHERE a."userId" = u."id" AND a."programKey" = 'BRONZE'
  );
