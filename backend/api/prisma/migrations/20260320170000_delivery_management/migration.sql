-- Delivery Management System schema extensions

CREATE TYPE "DeliveryExecutiveStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'BREAK', 'INACTIVE');
CREATE TYPE "DeliveryAssignmentStatus" AS ENUM ('WAITING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

ALTER TABLE "delivery_staff" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "delivery_staff" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "delivery_staff" ADD COLUMN "vehicleType" TEXT;
ALTER TABLE "delivery_staff" ADD COLUMN "vehicleNumber" TEXT;
ALTER TABLE "delivery_staff" ADD COLUMN "licenseNumber" TEXT;
ALTER TABLE "delivery_staff" ADD COLUMN "joiningDate" TIMESTAMP(3);
ALTER TABLE "delivery_staff" ADD COLUMN "rating" DECIMAL(3,2) NOT NULL DEFAULT 5;
ALTER TABLE "delivery_staff" ADD COLUMN "status" "DeliveryExecutiveStatus" NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE "delivery_staff" ADD COLUMN "currentLat" DOUBLE PRECISION;
ALTER TABLE "delivery_staff" ADD COLUMN "currentLng" DOUBLE PRECISION;
ALTER TABLE "delivery_staff" ADD COLUMN "activeOrders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "delivery_staff" ADD COLUMN "totalDeliveries" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "delivery_staff" ADD COLUMN "todayEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "delivery_staff" SET "employeeId" = 'RDR-' || SUBSTRING("id", 1, 6) WHERE "employeeId" IS NULL;
ALTER TABLE "delivery_staff" ALTER COLUMN "employeeId" SET NOT NULL;
CREATE UNIQUE INDEX "delivery_staff_employeeId_key" ON "delivery_staff"("employeeId");

ALTER TABLE "delivery_tracking" ADD COLUMN "status" "DeliveryAssignmentStatus" NOT NULL DEFAULT 'WAITING';
ALTER TABLE "delivery_tracking" ADD COLUMN "distanceKm" DECIMAL(8,2);
ALTER TABLE "delivery_tracking" ADD COLUMN "etaMinutes" INTEGER;
ALTER TABLE "delivery_tracking" ADD COLUMN "deliveryNotes" TEXT;
ALTER TABLE "delivery_tracking" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "delivery_tracking" ADD COLUMN "pickedUpAt" TIMESTAMP(3);
ALTER TABLE "delivery_tracking" ADD COLUMN "outForDeliveryAt" TIMESTAMP(3);
ALTER TABLE "delivery_tracking" ADD COLUMN "zoneId" TEXT;

CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "minKm" DECIMAL(6,2) NOT NULL,
    "maxKm" DECIMAL(6,2) NOT NULL,
    "charge" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_zones_slug_key" ON "delivery_zones"("slug");
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "delivery_proofs" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "signatureUrl" TEXT,
    "photoUrl" TEXT,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "qrVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_proofs_trackingId_key" ON "delivery_proofs"("trackingId");
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "delivery_tracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "delivery_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trackingId" TEXT,
    "deliveryStaffId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "delivery_tracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_deliveryStaffId_fkey" FOREIGN KEY ("deliveryStaffId") REFERENCES "delivery_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "delivery_ratings" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "foodRating" INTEGER,
    "deliveryRating" INTEGER,
    "packagingRating" INTEGER,
    "overallRating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_ratings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_ratings_trackingId_key" ON "delivery_ratings"("trackingId");
ALTER TABLE "delivery_ratings" ADD CONSTRAINT "delivery_ratings_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "delivery_tracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
