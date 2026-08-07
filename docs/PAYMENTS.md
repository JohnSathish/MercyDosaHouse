# Payment Gateways (Phase 4 Stubs)

## Current (Phase 1)

- **COD** — Cash on Delivery, payment status PENDING until delivered
- **UPI QR** — Static QR from business settings, manual admin confirmation

## Future Integrations

### Razorpay

Set env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

Endpoint stub: `POST /api/v1/payments/razorpay/create-order`

### Cashfree

Set env vars: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`

Endpoint stub: `POST /api/v1/payments/cashfree/create-order`

Payment records stored in `payments` table with `gatewayData` JSON field.
