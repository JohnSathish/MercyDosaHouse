-- Receipt / thermal print settings on business_settings
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowLogo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowQr" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowGst" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowAddress" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowCustomer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowCashier" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptShowPayment" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptFooterMessage" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptFontSize" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptPaperWidth" TEXT NOT NULL DEFAULT '80mm';
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptCopies" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptAutoPrintPayment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "receiptAutoPrintKot" BOOLEAN NOT NULL DEFAULT false;
