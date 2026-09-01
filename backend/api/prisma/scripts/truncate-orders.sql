-- Wipe trial orders and customer profiles so live operations can start today.
-- Keeps: menu, CMS, settings, inventory, coupons, staff/admin users, invoices
--         (invoice rows stay; customer/order links are cleared).
-- Safe to re-run. Optional tables (loyalty) are skipped if not migrated yet.

BEGIN;

-- Keep invoice documents; unlink from orders and customer accounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    UPDATE invoices SET "orderId" = NULL, "userId" = NULL;
  END IF;
END $$;

UPDATE customer_rewards SET "orderId" = NULL WHERE "orderId" IS NOT NULL;
UPDATE pos_hold_bills SET "orderId" = NULL WHERE "orderId" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_transactions') THEN
    UPDATE loyalty_transactions SET "orderId" = NULL WHERE "orderId" IS NOT NULL;
  END IF;
END $$;

DELETE FROM delivery_logs;

DELETE FROM inventory_consumption
WHERE "orderId" IN (SELECT id FROM orders);

DELETE FROM push_dispatches WHERE "orderId" IS NOT NULL;

-- Cascades: items, payments, status history, kitchen logs,
-- email notifications, delivery tracking/proof/rating, POS lines/discounts, reviews tied to orders
DELETE FROM orders;

-- Customer sessions (no FK to users)
DELETE FROM user_sessions
WHERE "userId" IN (
  SELECT u.id
  FROM users u
  INNER JOIN roles r ON r.id = u."roleId"
  WHERE r.name::text = 'CUSTOMER'
);

DELETE FROM login_history
WHERE "userId" IN (
  SELECT u.id
  FROM users u
  INNER JOIN roles r ON r.id = u."roleId"
  WHERE r.name::text = 'CUSTOMER'
);

-- Cascades: addresses, carts, favorites, notes, rewards, loyalty, device tokens, refresh tokens
DELETE FROM users
WHERE "roleId" IN (SELECT id FROM roles WHERE name::text = 'CUSTOMER');

UPDATE business_settings SET "orderSequence" = 0;
UPDATE delivery_staff SET "activeOrders" = 0, "todayEarnings" = 0, "totalDeliveries" = 0;
UPDATE pos_tables SET status = 'AVAILABLE';
UPDATE coupons SET "usageCount" = 0;

UPDATE category_analytics
SET orders = 0, revenue = 0, conversion = 0, popularity = 0;

COMMIT;
