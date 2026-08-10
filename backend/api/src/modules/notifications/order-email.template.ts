import {
  OrderEmailNotificationStatus,
  OrderEmailNotificationType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

export interface OrderEmailItem {
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderEmailPayload {
  orderNumber: string;
  createdAt: Date;
  orderType: OrderType;
  orderSource: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string | null;
  deliveryInstructions?: string | null;
  tableLabel?: string | null;
  tokenNumber?: number | null;
  scheduledDeliveryAt?: Date | null;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryCharge: number;
  packingCharge: number;
  preOrderDiscount: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  adminOrderUrl: string;
  logoUrl: string;
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Dine-In',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  ONLINE_PICKUP: 'Online Pickup',
  STAFF_MEAL: 'Staff Meal',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Cash on Delivery',
  UPI: 'UPI',
  RAZORPAY: 'Online Payment',
  CASHFREE: 'Online Payment',
  CASH: 'Cash',
  CARD: 'Card',
  WALLET: 'Wallet',
  SPLIT: 'Split Payment',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Confirmed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(date: Date): { date: string; time: string } {
  const d = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
  const t = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date);
  return { date: d, time: t };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function locationBlock(payload: OrderEmailPayload): string {
  if (payload.orderType === OrderType.DINE_IN && payload.tableLabel) {
    return `<p style="margin:0 0 6px;"><strong>Table:</strong> ${escapeHtml(payload.tableLabel)}</p>`;
  }
  if (payload.orderType === OrderType.ONLINE_PICKUP || payload.orderType === OrderType.TAKEAWAY) {
    const parts = [
      payload.tokenNumber ? `<strong>Token #:</strong> ${payload.tokenNumber}` : null,
      `<strong>Pickup:</strong> Mercy Dosa House — collect at counter`,
      payload.customerPhone ? `<strong>Phone:</strong> ${escapeHtml(payload.customerPhone)}` : null,
    ].filter(Boolean);
    return parts.map((p) => `<p style="margin:0 0 6px;">${p}</p>`).join('');
  }
  if (payload.deliveryAddress) {
    return `<p style="margin:0 0 6px;"><strong>Delivery Address:</strong> ${escapeHtml(payload.deliveryAddress)}</p>`;
  }
  return '<p style="margin:0;color:#64748b;">—</p>';
}

export function buildOrderConfirmedSubject(payload: OrderEmailPayload): string {
  return `🟢 New Order Confirmed — #${payload.orderNumber} | ${formatInr(payload.grandTotal)} | Mercy Dosa House`;
}

export function buildOrderConfirmedHtml(payload: OrderEmailPayload): string {
  const { date, time } = formatDateTime(payload.createdAt);
  const couponDiscount = Math.max(0, payload.discount - payload.preOrderDiscount);
  const itemRows = payload.items
    .map((item) => {
      const name = item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName;
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(name)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatInr(item.unitPrice)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatInr(item.totalPrice)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order ${escapeHtml(payload.orderNumber)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(20,83,45,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#14532D 0%,#166534 100%);padding:28px 24px;text-align:center;">
              <img src="${escapeHtml(payload.logoUrl)}" alt="Mercy Dosa House" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:12px;background:#fff;padding:6px;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Mercy Dosa House</h1>
              <p style="margin:8px 0 0;color:#FDE68A;font-size:14px;">Crispy Dosas. Happy Hearts.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#14532D;letter-spacing:0.04em;text-transform:uppercase;">🟢 New Order Confirmed</p>
              <h2 style="margin:0 0 16px;font-size:28px;color:#14532D;">Order #${escapeHtml(payload.orderNumber)}</h2>
              <table role="presentation" width="100%" style="background:#FFF8E8;border:1px solid #FDE68A;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 6px;"><strong>Date:</strong> ${escapeHtml(date)}</p>
                    <p style="margin:0 0 6px;"><strong>Time:</strong> ${escapeHtml(time)}</p>
                    <p style="margin:0 0 6px;"><strong>Order Type:</strong> ${ORDER_TYPE_LABELS[payload.orderType]}</p>
                    <p style="margin:0;"><strong>Source:</strong> ${escapeHtml(payload.orderSource)}</p>
                  </td>
                </tr>
              </table>

              <h3 style="margin:0 0 10px;font-size:16px;color:#14532D;">Customer Details</h3>
              <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(payload.customerName)}</p>
                <p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(payload.customerPhone)}</p>
                ${locationBlock(payload)}
                ${
                  payload.deliveryInstructions
                    ? `<p style="margin:8px 0 0;"><strong>Notes:</strong> ${escapeHtml(payload.deliveryInstructions)}</p>`
                    : ''
                }
              </div>

              <h3 style="margin:0 0 10px;font-size:16px;color:#14532D;">Order Items</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
                <thead>
                  <tr style="background:#14532D;color:#ffffff;">
                    <th align="left" style="padding:10px 8px;">Item</th>
                    <th style="padding:10px 8px;">Qty</th>
                    <th align="right" style="padding:10px 8px;">Price</th>
                    <th align="right" style="padding:10px 8px;">Amount</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <h3 style="margin:0 0 10px;font-size:16px;color:#14532D;">Payment &amp; Order Summary</h3>
              <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;font-size:14px;">
                <p style="margin:0 0 6px;display:flex;justify-content:space-between;"><span>Subtotal</span><span>${formatInr(payload.subtotal)}</span></p>
                <p style="margin:0 0 6px;display:flex;justify-content:space-between;"><span>Delivery</span><span>${payload.deliveryCharge <= 0 ? 'Free' : formatInr(payload.deliveryCharge)}</span></p>
                <p style="margin:0 0 6px;display:flex;justify-content:space-between;"><span>Packing</span><span>${formatInr(payload.packingCharge)}</span></p>
                ${
                  payload.preOrderDiscount > 0
                    ? `<p style="margin:0 0 6px;display:flex;justify-content:space-between;color:#059669;"><span>Pre-order Discount</span><span>-${formatInr(payload.preOrderDiscount)}</span></p>`
                    : ''
                }
                ${
                  couponDiscount > 0
                    ? `<p style="margin:0 0 6px;display:flex;justify-content:space-between;color:#059669;"><span>Discount</span><span>-${formatInr(couponDiscount)}</span></p>`
                    : ''
                }
                ${
                  payload.taxAmount > 0
                    ? `<p style="margin:0 0 6px;display:flex;justify-content:space-between;"><span>Tax</span><span>${formatInr(payload.taxAmount)}</span></p>`
                    : ''
                }
                <p style="margin:12px 0 6px;display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#14532D;border-top:1px solid #e2e8f0;padding-top:12px;"><span>Grand Total</span><span>${formatInr(payload.grandTotal)}</span></p>
                <p style="margin:12px 0 6px;"><strong>Payment Method:</strong> ${PAYMENT_METHOD_LABELS[payload.paymentMethod]}</p>
                <p style="margin:0 0 6px;"><strong>Payment Status:</strong> ${PAYMENT_STATUS_LABELS[payload.paymentStatus]}</p>
                <p style="margin:0;"><strong>Order Status:</strong> ${ORDER_STATUS_LABELS[payload.status] ?? payload.status}</p>
              </div>

              <div style="text-align:center;">
                <a href="${escapeHtml(payload.adminOrderUrl)}" style="display:inline-block;background:#F59E0B;color:#1F2937;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">View Order in Admin Dashboard</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#14532D;color:#d1fae5;text-align:center;padding:16px;font-size:12px;">
              Mercy Dosa House · Automated order notification · Do not reply
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOrderConfirmedText(payload: OrderEmailPayload): string {
  const { date, time } = formatDateTime(payload.createdAt);
  const lines = [
    'Mercy Dosa House — New Order Confirmed',
    `Order #${payload.orderNumber}`,
    `Date: ${date}  Time: ${time}`,
    `Order Type: ${ORDER_TYPE_LABELS[payload.orderType]}`,
    `Customer: ${payload.customerName} (${payload.customerPhone})`,
    ...payload.items.map(
      (i) =>
        `- ${i.quantity}x ${i.productName}${i.variantName ? ` (${i.variantName})` : ''}: ${formatInr(i.totalPrice)}`,
    ),
    `Grand Total: ${formatInr(payload.grandTotal)}`,
    `Payment: ${PAYMENT_METHOD_LABELS[payload.paymentMethod]} (${PAYMENT_STATUS_LABELS[payload.paymentStatus]})`,
    `Admin: ${payload.adminOrderUrl}`,
  ];
  return lines.join('\n');
}

export const ORDER_CONFIRMED_TYPE = OrderEmailNotificationType.ORDER_CONFIRMED;
export const EMAIL_STATUS = OrderEmailNotificationStatus;
