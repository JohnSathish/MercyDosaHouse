import type { InvoiceDiscountType, InvoiceTaxType } from '@mdh/types';

export type InvoiceLineInput = {
  description: string;
  notes?: string | null;
  quantity: number;
  unitPrice: number;
  productId?: string | null;
};

export type InvoiceTotalsInput = {
  items: InvoiceLineInput[];
  discountType?: InvoiceDiscountType | null;
  discountValue?: number | null;
  deliveryCharge?: number;
  packingCharge?: number;
  otherCharges?: number;
  taxEnabled?: boolean;
  taxType?: InvoiceTaxType;
  taxRate?: number;
};

export type ComputedInvoiceTotals = {
  items: Array<InvoiceLineInput & { amount: number; sortOrder: number }>;
  subtotal: number;
  discountAmount: number;
  taxable: number;
  deliveryCharge: number;
  packingCharge: number;
  otherCharges: number;
  taxEnabled: boolean;
  taxType: InvoiceTaxType;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  grandTotal: number;
};

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function computeInvoiceTotals(input: InvoiceTotalsInput): ComputedInvoiceTotals {
  const items = (input.items || [])
    .map((item, index) => {
      const quantity = money(Number(item.quantity));
      const unitPrice = money(Number(item.unitPrice));
      return {
        description: String(item.description || '').trim(),
        notes: item.notes?.trim() || null,
        productId: item.productId || null,
        quantity,
        unitPrice,
        amount: money(quantity * unitPrice),
        sortOrder: index,
      };
    })
    .filter((item) => item.description && item.quantity > 0);

  const subtotal = money(items.reduce((sum, item) => sum + item.amount, 0));
  const discountValue = money(Number(input.discountValue ?? 0));
  let discountAmount = 0;
  if (input.discountType === 'PERCENTAGE') {
    discountAmount = money(subtotal * (Math.min(100, Math.max(0, discountValue)) / 100));
  } else if (input.discountType === 'FIXED') {
    discountAmount = money(Math.min(subtotal, Math.max(0, discountValue)));
  }

  const deliveryCharge = money(Math.max(0, Number(input.deliveryCharge ?? 0)));
  const packingCharge = money(Math.max(0, Number(input.packingCharge ?? 0)));
  const otherCharges = money(Math.max(0, Number(input.otherCharges ?? 0)));
  const taxable = money(Math.max(0, subtotal - discountAmount));

  const taxEnabled = Boolean(input.taxEnabled) && Number(input.taxRate ?? 0) > 0;
  const taxType: InvoiceTaxType = taxEnabled ? input.taxType || 'OTHER' : 'NONE';
  const taxRate = taxEnabled ? money(Math.max(0, Number(input.taxRate ?? 0))) : 0;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxAmount = 0;
  if (taxEnabled && taxRate > 0) {
    if (taxType === 'CGST_SGST') {
      const half = money(taxable * (taxRate / 200));
      cgstAmount = half;
      sgstAmount = half;
      taxAmount = money(cgstAmount + sgstAmount);
    } else {
      taxAmount = money(taxable * (taxRate / 100));
      if (taxType === 'IGST') igstAmount = taxAmount;
    }
  }

  const grandTotal = money(taxable + deliveryCharge + packingCharge + otherCharges + taxAmount);

  return {
    items,
    subtotal,
    discountAmount,
    taxable,
    deliveryCharge,
    packingCharge,
    otherCharges,
    taxEnabled,
    taxType,
    taxRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    grandTotal,
  };
}
