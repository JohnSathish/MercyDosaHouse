export interface UpiPaymentQrOptions {
  upiId: string;
  amount: number;
  payeeName?: string;
  note?: string;
}

export interface ReceiptQrOptions {
  upiId?: string | null;
  payeeName?: string;
  amount: number;
  orderNumber: string;
  note?: string;
  /** Fallback when no UPI ID — e.g. order tracking URL */
  trackUrl?: string;
}

/** NPCI UPI deep link — scannable by GPay, PhonePe, Paytm, etc. */
export function buildUpiPaymentUri(options: UpiPaymentQrOptions): string {
  const upiId = encodeURIComponent(options.upiId.trim());
  const parts = [`pa=${upiId}`, `am=${Math.max(0, options.amount).toFixed(2)}`, 'cu=INR'];
  if (options.payeeName?.trim()) {
    parts.push(`pn=${encodeURIComponent(options.payeeName.trim().slice(0, 50))}`);
  }
  const note = options.note?.trim() || 'Payment';
  parts.push(`tn=${encodeURIComponent(note.slice(0, 80))}`);
  return `upi://pay?${parts.join('&')}`;
}

/** QR payload: UPI pay link when configured, else tracking URL or order JSON. */
export function buildReceiptQrPayload(options: ReceiptQrOptions): string {
  const upiId = options.upiId?.trim();
  if (upiId) {
    return buildUpiPaymentUri({
      upiId,
      payeeName: options.payeeName,
      amount: options.amount,
      note: options.note ?? `Order ${options.orderNumber}`,
    });
  }
  if (options.trackUrl?.trim()) return options.trackUrl.trim();
  return JSON.stringify({
    orderId: options.orderNumber,
    amount: options.amount,
  });
}

export function getReceiptQrCaption(upiId?: string | null): string {
  if (upiId?.trim()) return 'Scan to pay with any UPI app';
  return 'Scan for order details';
}

export function getReceiptQrSubcaption(upiId?: string | null): string | null {
  if (!upiId?.trim()) return null;
  return `UPI: ${upiId.trim()}`;
}
