-- Per-item packing charge system

ALTER TABLE "products" ADD COLUMN "packingCharge" DECIMAL(10,2) NOT NULL DEFAULT 20;

ALTER TABLE "orders" ADD COLUMN "packedItemCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "order_items" ADD COLUMN "unitPackingCharge" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN "packingCharge" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Set default packing charge on existing products
UPDATE "products" SET "packingCharge" = 20 WHERE "packingCharge" IS NULL OR "packingCharge" = 0;
UPDATE "products" SET "packingCharge" = 25 WHERE "slug" = 'chicken-biryani';
