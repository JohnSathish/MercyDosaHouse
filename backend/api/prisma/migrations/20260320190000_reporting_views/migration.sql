-- Reporting views for BI module

CREATE OR REPLACE VIEW vw_sales_summary AS
SELECT
  DATE("createdAt") AS sale_date,
  COUNT(*)::int AS order_count,
  COALESCE(SUM("grandTotal"), 0)::decimal AS revenue,
  COALESCE(SUM("discount"), 0)::decimal AS discount_total,
  COALESCE(AVG("grandTotal"), 0)::decimal AS avg_order_value
FROM orders
WHERE status NOT IN ('CANCELLED')
GROUP BY DATE("createdAt");

CREATE OR REPLACE VIEW vw_product_sales AS
SELECT
  oi."productId" AS product_id,
  oi."productName" AS product_name,
  p."categoryId" AS category_id,
  c.name AS category_name,
  SUM(oi.quantity)::int AS total_quantity,
  COALESCE(SUM(oi."totalPrice"), 0)::decimal AS total_revenue,
  COUNT(DISTINCT oi."orderId")::int AS order_count
FROM order_items oi
JOIN orders o ON o.id = oi."orderId" AND o.status NOT IN ('CANCELLED')
LEFT JOIN products p ON p.id = oi."productId"
LEFT JOIN categories c ON c.id = p."categoryId"
GROUP BY oi."productId", oi."productName", p."categoryId", c.name;

CREATE OR REPLACE VIEW vw_customer_summary AS
SELECT
  u.id AS user_id,
  u.name,
  u.phone,
  u."loyaltyTier" AS loyalty_tier,
  COUNT(o.id)::int AS total_orders,
  COALESCE(SUM(o."grandTotal"), 0)::decimal AS total_spent,
  MAX(o."createdAt") AS last_order_at
FROM users u
LEFT JOIN orders o ON o."userId" = u.id AND o.status NOT IN ('CANCELLED')
GROUP BY u.id, u.name, u.phone, u."loyaltyTier";

CREATE OR REPLACE VIEW vw_payment_summary AS
SELECT
  "paymentMethod" AS payment_method,
  DATE("createdAt") AS payment_date,
  COUNT(*)::int AS order_count,
  COALESCE(SUM("grandTotal"), 0)::decimal AS total_amount
FROM orders
WHERE status NOT IN ('CANCELLED')
GROUP BY "paymentMethod", DATE("createdAt");

CREATE OR REPLACE VIEW vw_delivery_summary AS
SELECT
  DATE(o."createdAt") AS delivery_date,
  COUNT(*)::int AS total_deliveries,
  COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::int AS completed,
  COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int AS cancelled,
  COALESCE(AVG(dt."etaMinutes"), 0)::decimal AS avg_eta_minutes
FROM orders o
LEFT JOIN delivery_tracking dt ON dt."orderId" = o.id
WHERE o.status IN ('OUT_FOR_DELIVERY', 'DELIVERED')
GROUP BY DATE(o."createdAt");

CREATE OR REPLACE VIEW vw_profit_analysis AS
SELECT
  DATE(o."createdAt") AS sale_date,
  COALESCE(SUM(o."grandTotal"), 0)::decimal AS revenue,
  COALESCE(SUM(o."grandTotal") * 0.35, 0)::decimal AS estimated_food_cost,
  COALESCE(SUM(o."grandTotal") * 0.55, 0)::decimal AS estimated_profit,
  COALESCE(SUM(o."deliveryCharge"), 0)::decimal AS delivery_revenue,
  COALESCE(SUM(o.discount), 0)::decimal AS discounts
FROM orders o
WHERE o.status NOT IN ('CANCELLED')
GROUP BY DATE(o."createdAt");
