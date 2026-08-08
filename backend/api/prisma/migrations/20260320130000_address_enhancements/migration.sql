-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN "contact_name" TEXT;
ALTER TABLE "addresses" ADD COLUMN "mobile_number" TEXT;
ALTER TABLE "addresses" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'Meghalaya';
ALTER TABLE "addresses" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'India';
ALTER TABLE "addresses" ADD COLUMN "delivery_notes" TEXT;
ALTER TABLE "addresses" ADD COLUMN "address_type" "AddressType" NOT NULL DEFAULT 'HOME';

-- Backfill existing rows
UPDATE "addresses" SET "contact_name" = 'Customer' WHERE "contact_name" IS NULL;
UPDATE "addresses" SET "mobile_number" = '9000000000' WHERE "mobile_number" IS NULL;

ALTER TABLE "addresses" ALTER COLUMN "contact_name" SET NOT NULL;
ALTER TABLE "addresses" ALTER COLUMN "mobile_number" SET NOT NULL;
