-- Customer authentication remote config (email OTP / Google / mobile OTP / guest).
ALTER TABLE "business_settings" ADD COLUMN "authConfig" JSONB;
