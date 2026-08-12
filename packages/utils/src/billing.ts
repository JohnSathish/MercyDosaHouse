/** Local packing fields — avoid importing from index (require cycle). */
type PackingFields = { quantity: number; packingCharge?: number | null };

function packingTotalOf(items: PackingFields[]): number {
  return items.reduce((sum, item) => sum + (item.packingCharge ?? 20) * item.quantity, 0);
}

export interface BillLineItem extends PackingFields {
  unitPrice: number;
  productId?: string;
  categoryGstPercent?: number | null;
}

export interface PosModeConfig {
  applyDelivery: boolean;
  applyPacking: boolean;
  requireTable: boolean;
  minOrderAmount: number;
}

export const POS_MODE_CONFIG: Record<string, PosModeConfig> = {
  DINE_IN: { applyDelivery: false, applyPacking: false, requireTable: true, minOrderAmount: 0 },
  TAKEAWAY: { applyDelivery: false, applyPacking: true, requireTable: false, minOrderAmount: 0 },
  DELIVERY: { applyDelivery: true, applyPacking: true, requireTable: false, minOrderAmount: 100 },
  ONLINE_PICKUP: {
    applyDelivery: false,
    applyPacking: true,
    requireTable: false,
    minOrderAmount: 0,
  },
  STAFF_MEAL: { applyDelivery: false, applyPacking: false, requireTable: false, minOrderAmount: 0 },
};

export function calculateSubtotal(items: Pick<BillLineItem, 'unitPrice' | 'quantity'>[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function calculateGstLines(items: BillLineItem[]): {
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
} {
  let taxAmount = 0;
  for (const item of items) {
    const gst = item.categoryGstPercent ?? 0;
    if (gst <= 0) continue;
    const lineTotal = item.unitPrice * item.quantity;
    taxAmount += Math.round((lineTotal * gst) / 100);
  }
  const half = Math.round(taxAmount / 2);
  return { taxAmount, cgstAmount: half, sgstAmount: taxAmount - half };
}

export function calculateCouponDiscount(
  subtotal: number,
  type: 'PERCENTAGE' | 'FIXED',
  value: number,
  maxDiscount?: number | null,
): number {
  let discount = type === 'PERCENTAGE' ? Math.round((subtotal * value) / 100) : value;
  if (maxDiscount != null && discount > maxDiscount) discount = maxDiscount;
  return Math.max(0, Math.min(discount, subtotal));
}

export function calculatePosGrandTotal(input: {
  subtotal: number;
  deliveryCharge: number;
  packingCharge: number;
  taxAmount: number;
  discount: number;
}): number {
  return Math.max(
    0,
    input.subtotal + input.deliveryCharge + input.packingCharge + input.taxAmount - input.discount,
  );
}

export function calculatePosBillTotals(
  items: BillLineItem[],
  options: {
    orderType: string;
    deliveryCharge?: number;
    discount?: number;
    minOrderAmount?: number;
  },
): {
  subtotal: number;
  packingCharge: number;
  packedItemCount: number;
  deliveryCharge: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  discount: number;
  grandTotal: number;
} {
  const mode = POS_MODE_CONFIG[options.orderType] ?? POS_MODE_CONFIG.TAKEAWAY;
  const subtotal = calculateSubtotal(items);
  const packingCharge = mode.applyPacking ? packingTotalOf(items) : 0;
  const packedItemCount = items.reduce((s, i) => s + i.quantity, 0);
  const deliveryCharge = mode.applyDelivery ? (options.deliveryCharge ?? 30) : 0;
  const { taxAmount, cgstAmount, sgstAmount } = calculateGstLines(items);
  const discount = options.discount ?? 0;
  const grandTotal = calculatePosGrandTotal({
    subtotal,
    deliveryCharge,
    packingCharge,
    taxAmount,
    discount,
  });

  if (mode.minOrderAmount > 0 && subtotal < mode.minOrderAmount) {
    throw new Error(`Minimum order amount is ₹${mode.minOrderAmount}`);
  }

  return {
    subtotal,
    packingCharge,
    packedItemCount,
    deliveryCharge,
    taxAmount,
    cgstAmount,
    sgstAmount,
    discount,
    grandTotal,
  };
}

export function calculateChangeDue(amountReceived: number, grandTotal: number): number {
  return Math.max(0, amountReceived - grandTotal);
}
