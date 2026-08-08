-- Kitchen Display System schema

CREATE TYPE "KitchenPriority" AS ENUM ('NORMAL', 'HIGH', 'VIP', 'EXPRESS');
CREATE TYPE "KitchenItemStatus" AS ENUM ('WAITING', 'PREPARING', 'READY');

CREATE TABLE "kitchen_stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_stations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kitchen_stations_slug_key" ON "kitchen_stations"("slug");

ALTER TABLE "categories" ADD COLUMN "kitchenStationId" TEXT;
ALTER TABLE "categories" ADD CONSTRAINT "categories_kitchenStationId_fkey" FOREIGN KEY ("kitchenStationId") REFERENCES "kitchen_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN "tokenNumber" INTEGER;
ALTER TABLE "orders" ADD COLUMN "priority" "KitchenPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "orders" ADD COLUMN "kitchenStartedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "kitchenCompletedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "queuePosition" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "order_items" ADD COLUMN "kitchenStatus" "KitchenItemStatus" NOT NULL DEFAULT 'WAITING';
ALTER TABLE "order_items" ADD COLUMN "specialInstructions" TEXT;

CREATE TABLE "kitchen_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stationId" TEXT,
    "action" TEXT NOT NULL,
    "performedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "kitchen_logs" ADD CONSTRAINT "kitchen_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_logs" ADD CONSTRAINT "kitchen_logs_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "kitchen_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kitchen_logs" ADD CONSTRAINT "kitchen_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
