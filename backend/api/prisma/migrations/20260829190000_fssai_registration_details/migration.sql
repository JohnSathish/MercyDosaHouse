-- Store the restaurant's official FSSAI registration as centrally managed business settings.
ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "fssaiEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "fssaiRegistrationNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "fssaiBusinessName" TEXT,
  ADD COLUMN IF NOT EXISTS "fssaiBusinessAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "fssaiPremisesAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "fssaiNearestLandmark" TEXT,
  ADD COLUMN IF NOT EXISTS "fssaiKindOfBusiness" TEXT,
  ADD COLUMN IF NOT EXISTS "fssaiIssuedOn" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fssaiFeePaidUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fssaiCertificateUrl" TEXT;

INSERT INTO "business_settings" (
  "fssaiEnabled",
  "fssaiRegistrationNumber",
  "fssaiBusinessName",
  "fssaiBusinessAddress",
  "fssaiPremisesAddress",
  "fssaiNearestLandmark",
  "fssaiKindOfBusiness",
  "fssaiIssuedOn",
  "fssaiFeePaidUntil"
)
SELECT
  true,
  '21726006000529',
  'John Sathish Soundararajan',
  'THURINJIKOLLAI, NELLIKOLLAI PO, Bhuvanagiri block, Cuddalore, Tamil Nadu - 608074',
  'DON BOSCO COLLEGE, TURA, Lower Chandmari, Tura Town, West Garo Hills, Meghalaya - 794001',
  'DON BOSCO COLLEGE TUREA',
  'Food Vending Establishment',
  '2026-08-27T00:00:00.000Z',
  '2027-08-26T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM "business_settings");

UPDATE "business_settings"
SET
  "fssaiEnabled" = true,
  "fssaiRegistrationNumber" = '21726006000529',
  "fssaiBusinessName" = 'John Sathish Soundararajan',
  "fssaiBusinessAddress" = 'THURINJIKOLLAI, NELLIKOLLAI PO, Bhuvanagiri block, Cuddalore, Tamil Nadu - 608074',
  "fssaiPremisesAddress" = 'DON BOSCO COLLEGE, TURA, Lower Chandmari, Tura Town, West Garo Hills, Meghalaya - 794001',
  "fssaiNearestLandmark" = 'DON BOSCO COLLEGE TUREA',
  "fssaiKindOfBusiness" = 'Food Vending Establishment',
  "fssaiIssuedOn" = '2026-08-27T00:00:00.000Z',
  "fssaiFeePaidUntil" = '2027-08-26T00:00:00.000Z'
WHERE "fssaiRegistrationNumber" IS NULL;
