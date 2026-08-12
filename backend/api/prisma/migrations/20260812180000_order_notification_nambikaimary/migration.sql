-- Replace legacy order-notification inbox with nambikaimary96@gmail.com

UPDATE "order_notification_recipients"
SET
  email = 'nambikaimary96@gmail.com',
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE lower(email) = lower('SUDHABCA96@gmail.com')
  AND NOT EXISTS (
    SELECT 1
    FROM "order_notification_recipients" AS existing
    WHERE lower(existing.email) = lower('nambikaimary96@gmail.com')
  );

DELETE FROM "order_notification_recipients"
WHERE lower(email) = lower('SUDHABCA96@gmail.com');

INSERT INTO "order_notification_recipients" (
  id,
  email,
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'nambikaimary96@gmail.com',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "order_notification_recipients"
  WHERE lower(email) = lower('nambikaimary96@gmail.com')
);
