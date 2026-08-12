-- Wipe trial/test customer & POS orders. Keeps menu, users, settings, recipients.
-- Safe to re-run.

BEGIN;

DELETE FROM delivery_logs;
DELETE FROM inventory_consumption
WHERE "orderId" IN (SELECT id FROM orders);

UPDATE customer_rewards SET "orderId" = NULL WHERE "orderId" IS NOT NULL;
UPDATE pos_hold_bills SET "orderId" = NULL WHERE "orderId" IS NOT NULL;

-- Cascades remove items, payments, status history, kitchen logs,
-- email notifications, delivery tracking/proof/rating, POS lines/discounts
DELETE FROM orders;

UPDATE business_settings SET "orderSequence" = 0;
UPDATE delivery_staff SET "activeOrders" = 0, "todayEarnings" = 0;

COMMIT;
