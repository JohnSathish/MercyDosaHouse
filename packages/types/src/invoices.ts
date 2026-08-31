export const INVOICE_CUSTOMER_TYPES = [
  'ORGANISATION',
  'INSTITUTION',
  'FAMILY',
  'INDIVIDUAL',
  'EVENT',
  'OTHER',
] as const;

export type InvoiceCustomerType = (typeof INVOICE_CUSTOMER_TYPES)[number];

export const INVOICE_STATUSES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_PAYMENT_METHODS = [
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CARD',
  'CHEQUE',
  'OTHER',
] as const;

export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];

export const INVOICE_TAX_TYPES = ['NONE', 'CGST_SGST', 'IGST', 'OTHER'] as const;
export type InvoiceTaxType = (typeof INVOICE_TAX_TYPES)[number];

export type InvoiceDiscountType = 'PERCENTAGE' | 'FIXED';

export interface InvoiceBankDetailsDto {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
}

export interface InvoiceConfigDto {
  prefix: string;
  dueDays: number;
  defaultPaymentTerms: string;
  taxEnabled: boolean;
  taxType: InvoiceTaxType;
  taxRate: number;
  showBankDetails: boolean;
  showUpiQr: boolean;
  footer: string;
  termsAndConditions: string;
  paymentInstructions: string;
  pan: string;
  bank: InvoiceBankDetailsDto;
}

export interface InvoiceItemInput {
  productId?: string | null;
  description: string;
  notes?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceItemDto extends InvoiceItemInput {
  id: string;
  amount: number;
  sortOrder: number;
}

export interface InvoicePaymentDto {
  id: string;
  amount: number;
  paidAt: string;
  method: InvoicePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recordedByName?: string | null;
}

export interface InvoiceEventDto {
  id: string;
  action: string;
  userName?: string | null;
  detail?: string | null;
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  outletKey: string;
  orderId?: string | null;
  orderNumber?: string | null;
  userId?: string | null;
  customerType: InvoiceCustomerType;
  customerName: string;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  gstin?: string | null;
  pan?: string | null;
  referenceNumber?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  items: InvoiceItemDto[];
  subtotal: number;
  discountType?: InvoiceDiscountType | null;
  discountValue?: number | null;
  discountAmount: number;
  discountLabel?: string | null;
  applyPromoDiscount: boolean;
  deliveryCharge: number;
  packingCharge: number;
  otherCharges: number;
  otherChargesLabel?: string | null;
  taxEnabled: boolean;
  taxType: InvoiceTaxType;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  amountInWords: string;
  status: InvoiceStatus;
  payments: InvoicePaymentDto[];
  events?: InvoiceEventDto[];
  previousInvoices?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number;
    status: InvoiceStatus;
  }[];
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
}

export interface InvoiceListItemDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerType: InvoiceCustomerType;
  phone?: string | null;
  email?: string | null;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
}

export interface InvoiceStatsDto {
  todayTotal: number;
  monthTotal: number;
  pendingPayment: number;
  paidCount: number;
  outstanding: number;
}

export interface CreateInvoiceRequest {
  outletKey?: string;
  orderId?: string | null;
  userId?: string | null;
  customerType: InvoiceCustomerType;
  customerName: string;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  gstin?: string | null;
  pan?: string | null;
  referenceNumber?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  invoiceDate?: string;
  dueDate?: string;
  items: InvoiceItemInput[];
  discountType?: InvoiceDiscountType | null;
  discountValue?: number | null;
  discountLabel?: string | null;
  applyPromoDiscount?: boolean;
  deliveryCharge?: number;
  packingCharge?: number;
  otherCharges?: number;
  otherChargesLabel?: string | null;
  taxEnabled?: boolean;
  taxType?: InvoiceTaxType;
  taxRate?: number;
}

export interface RecordInvoicePaymentRequest {
  amount: number;
  paidAt?: string;
  method: InvoicePaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export interface SendInvoiceRequest {
  to?: string;
  whatsapp?: string;
}

export const INVOICE_CUSTOMER_TYPE_LABELS: Record<InvoiceCustomerType, string> = {
  ORGANISATION: 'Organisation',
  INSTITUTION: 'Institution',
  FAMILY: 'Family',
  INDIVIDUAL: 'Individual',
  EVENT: 'Event / Function',
  OTHER: 'Other',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export const INVOICE_PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};
