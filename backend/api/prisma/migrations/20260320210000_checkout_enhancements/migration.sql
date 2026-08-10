-- Checkout flow enhancements

ALTER TABLE "orders" ADD COLUMN "addressId" TEXT;
ALTER TABLE "orders" ADD COLUMN "scheduledDeliveryAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "rewardPointsUsed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_addressId_idx" ON "orders"("addressId");
