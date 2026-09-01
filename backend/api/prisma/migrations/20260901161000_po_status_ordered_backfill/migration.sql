-- Safe in a later transaction: PostgreSQL cannot use a newly added enum value
-- in the same transaction that created it.
UPDATE "purchase_orders" SET "status" = 'ORDERED' WHERE "status" IN ('SENT', 'APPROVED');
