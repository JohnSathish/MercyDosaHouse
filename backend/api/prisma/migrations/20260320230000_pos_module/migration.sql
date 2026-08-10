-- Enterprise Restaurant POS Module

-- Enums
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ONLINE_PICKUP', 'STAFF_MEAL');
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'POS', 'QR_MENU', 'KIOSK');
CREATE TYPE "PosTableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BILLING', 'WAITING');
CREATE TYPE "PosBillStatus" AS ENUM ('OPEN', 'HELD', 'SETTLED', 'VOIDED', 'REFUNDED');
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PosDiscountType" AS ENUM ('FLAT', 'PERCENTAGE', 'ITEM', 'BILL', 'HAPPY_HOUR', 'COUPON', 'STAFF', 'MANAGER');

-- Extend OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SERVED' AFTER 'READY';

-- Extend PaymentMethod
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CARD';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'SPLIT';

-- User extensions
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "managerPinHash" TEXT;

-- Order extensions
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "orderType" "OrderType" NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "orderSource" "OrderSource" NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billStatus" "PosBillStatus" NOT NULL DEFAULT 'SETTLED';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "posTableId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "posSessionId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cashierId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "covers" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "servedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "orders" ALTER COLUMN "deliveryAddress" DROP NOT NULL;

UPDATE "orders" SET "orderSource" = 'WEBSITE' WHERE "orderSource" IS NULL;
UPDATE "orders" SET "billStatus" = 'SETTLED' WHERE "billStatus" IS NULL;

-- POS tables
CREATE TABLE IF NOT EXISTS "pos_floors" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "layoutJson" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_floors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_tables" (
  "id" TEXT NOT NULL,
  "floorId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 4,
  "status" "PosTableStatus" NOT NULL DEFAULT 'AVAILABLE',
  "posX" INTEGER NOT NULL DEFAULT 0,
  "posY" INTEGER NOT NULL DEFAULT 0,
  "mergedIntoId" TEXT,
  "qrCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_terminals" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "deviceKey" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_sessions" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "terminalId" TEXT,
  "cashierId" TEXT NOT NULL,
  "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
  "openingFloat" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "closingCash" DECIMAL(10,2),
  "cashIn" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "cashOut" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalRefunds" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_hold_bills" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "tableId" TEXT,
  "orderId" TEXT,
  "payloadJson" JSONB NOT NULL,
  "label" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_hold_bills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_payment_lines" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_payment_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_discounts" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "PosDiscountType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reason" TEXT,
  "approvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_discounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_cash_transactions" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reason" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_cash_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_offline_queue" (
  "id" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "syncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_offline_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pos_tables_floorId_label_key" ON "pos_tables"("floorId", "label");
CREATE UNIQUE INDEX IF NOT EXISTS "pos_terminals_deviceKey_key" ON "pos_terminals"("deviceKey");

ALTER TABLE "pos_floors" ADD CONSTRAINT "pos_floors_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_tables" ADD CONSTRAINT "pos_tables_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "pos_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_tables" ADD CONSTRAINT "pos_tables_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "pos_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_hold_bills" ADD CONSTRAINT "pos_hold_bills_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_hold_bills" ADD CONSTRAINT "pos_hold_bills_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "pos_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_payment_lines" ADD CONSTRAINT "pos_payment_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_discounts" ADD CONSTRAINT "pos_discounts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_discounts" ADD CONSTRAINT "pos_discounts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_posTableId_fkey" FOREIGN KEY ("posTableId") REFERENCES "pos_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
