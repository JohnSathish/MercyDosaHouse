# Payment Gateways

## Current (Phase 1)

- **COD** — Cash on Delivery, payment status PENDING until delivered
- **UPI QR** — Static QR from business settings, manual admin confirmation

## Razorpay

Set env vars:

```env
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxx
```

### Create payment order (after MDH order is placed)

```
POST /api/v1/payments/razorpay/create-order
Authorization: Bearer <admin-or-customer-token>
{ "orderId": "<mdh-order-uuid>" }
```

Returns `{ razorpayOrderId, amount, currency, keyId }` for Razorpay Checkout on the client.

### Webhook (configure in Razorpay Dashboard)

```
POST /api/v1/payments/razorpay/webhook
Header: x-razorpay-signature
```

- Verifies HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET`
- Handles `payment.captured` events
- Idempotent — duplicate webhooks are ignored
- Validates amount matches server `grandTotal` before marking paid

**Never mark an order paid based on frontend callback alone.**

## Cashfree

Set env vars: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` (integration pending)

Payment records stored in `payments` table with `gatewayData` JSON field.

## Order quote (checkout preview)

```
POST /api/v1/orders/quote
{
  "items": [{ "productId": "...", "variantId": "...", "quantity": 1 }],
  "couponCode": "SAVE10",
  "scheduledDeliveryAt": "2026-08-12T12:00:00.000Z",
  "rewardPointsUsed": 50
}
```

Returns server-authoritative pricing breakdown — same logic as order create.
