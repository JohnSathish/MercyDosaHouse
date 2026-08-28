ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "deliveryLandmark" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "deliveryLongitude" DOUBLE PRECISION;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEAR_CUSTOMER';

ALTER TABLE "delivery_tracking"
  ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "locationAccuracyMeters" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationSharingActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "routePolyline" TEXT,
  ADD COLUMN IF NOT EXISTS "nearCustomerNotifiedAt" TIMESTAMP(3);

ALTER TABLE "delivery_config"
  ADD COLUMN IF NOT EXISTS "trackingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "customerTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deliveryRadiusKm" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "locationUpdateIntervalSeconds" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "locationMinDistanceMeters" INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS "locationHistoryRetentionDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "mapProvider" TEXT NOT NULL DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS "etaEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "nearCustomerEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "nearCustomerThresholdMeters" INTEGER NOT NULL DEFAULT 500;

CREATE TABLE IF NOT EXISTS "delivery_location_points" (
  "id" TEXT NOT NULL,
  "trackingId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracyMeters" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_location_points_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_location_points_trackingId_fkey"
    FOREIGN KEY ("trackingId") REFERENCES "delivery_tracking"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "delivery_location_points_trackingId_recordedAt_idx"
  ON "delivery_location_points"("trackingId", "recordedAt");

ALTER TABLE "delivery_zones"
  ADD COLUMN IF NOT EXISTS "minimumOrderAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "estimatedDeliveryMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "polygon" JSONB;
