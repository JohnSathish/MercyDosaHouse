-- Add pincodes to delivery_config for pincode-based delivery zone matching
ALTER TABLE "delivery_config" ADD COLUMN IF NOT EXISTS "pincodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Seed Walbakgre / Tura delivery pincodes for existing config
UPDATE "delivery_config"
SET
  "pincodes" = ARRAY['794101', '794001', '794002'],
  "areas" = ARRAY['Walbakgre', 'Walbagre', 'Holy Cross Hospital Area', 'Holy Cross Hospital']
WHERE "pincodes" = ARRAY[]::TEXT[] OR "pincodes" IS NULL;
