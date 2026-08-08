-- Inventory Management System schema

CREATE TYPE "InventoryUnit" AS ENUM ('KG', 'GRAM', 'LITRE', 'ML', 'PIECE', 'PACKET', 'BOTTLE', 'TRAY', 'DOZEN', 'BUNDLE');
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'GRN', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'CONSUMPTION', 'WASTE', 'TRANSFER_IN', 'TRANSFER_OUT', 'CORRECTION');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'RECEIVED', 'CLOSED', 'CANCELLED');
CREATE TYPE "StockAdjustmentReason" AS ENUM ('ADD', 'REMOVE', 'CORRECTION', 'DAMAGE', 'SAMPLE', 'LOSS');
CREATE TYPE "WasteReason" AS ENUM ('EXPIRED', 'DAMAGED', 'KITCHEN_WASTE', 'SPILLAGE', 'RETURNED', 'QUALITY_ISSUE');
CREATE TYPE "InventoryItemStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "inventory_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_categories_name_key" ON "inventory_categories"("name");
CREATE UNIQUE INDEX "inventory_categories_slug_key" ON "inventory_categories"("slug");

CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_locations_slug_key" ON "inventory_locations"("slug");
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstNumber" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reservedStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "maxStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "locationId" TEXT,
    "expiryTracking" BOOLEAN NOT NULL DEFAULT false,
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'IN_STOCK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_items_sku_key" ON "inventory_items"("sku");
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "mfgDate" TIMESTAMP(3),
    "quantity" DECIMAL(12,3) NOT NULL,
    "remainingQty" DECIMAL(12,3) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "receivedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "goods_received" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "remarks" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goods_received_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "goods_received_grnNumber_key" ON "goods_received"("grnNumber");
ALTER TABLE "goods_received" ADD CONSTRAINT "goods_received_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "grn_items" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "receivedQty" DECIMAL(12,3) NOT NULL,
    "damagedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "acceptedQty" DECIMAL(12,3) NOT NULL,
    "rejectedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_received"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "beforeQty" DECIMAL(12,3) NOT NULL,
    "afterQty" DECIMAL(12,3) NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "recipe_master" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recipe_master_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recipe_master_productId_key" ON "recipe_master"("productId");
ALTER TABLE "recipe_master" ADD CONSTRAINT "recipe_master_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "recipe_items" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recipe_items_recipeId_itemId_key" ON "recipe_items"("recipeId", "itemId");
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipe_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_consumption" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_consumption_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "inventory_consumption" ADD CONSTRAINT "inventory_consumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_waste" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reason" "WasteReason" NOT NULL,
    "costLoss" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_waste_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "inventory_waste" ADD CONSTRAINT "inventory_waste_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_audit" (
    "id" TEXT NOT NULL,
    "locationId" TEXT,
    "itemId" TEXT,
    "systemQty" DECIMAL(12,3) NOT NULL,
    "physicalQty" DECIMAL(12,3) NOT NULL,
    "difference" DECIMAL(12,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "auditedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_audit_pkey" PRIMARY KEY ("id")
);
