export type InvoiceTaxType = 'NONE' | 'CGST_SGST' | 'IGST' | 'OTHER';

export type InvoiceBankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

export type InvoiceConfig = {
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
  bank: InvoiceBankDetails;
};

export const EMPTY_BANK_DETAILS: InvoiceBankDetails = {
  accountName: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  upiId: '',
};

export const DEFAULT_INVOICE_CONFIG: InvoiceConfig = {
  prefix: 'MDH-INV',
  dueDays: 0,
  defaultPaymentTerms: 'Due on receipt',
  taxEnabled: false,
  taxType: 'NONE',
  taxRate: 0,
  showBankDetails: true,
  showUpiQr: true,
  footer: 'Thank you for choosing Mercy Dosa House! ❤️',
  termsAndConditions: '',
  paymentInstructions: '',
  pan: '',
  bank: { ...EMPTY_BANK_DETAILS },
};

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

const TAX_TYPES: InvoiceTaxType[] = ['NONE', 'CGST_SGST', 'IGST', 'OTHER'];

function taxType(value: unknown, fallback: InvoiceTaxType): InvoiceTaxType {
  return TAX_TYPES.includes(value as InvoiceTaxType) ? (value as InvoiceTaxType) : fallback;
}

function parseBank(raw: unknown): InvoiceBankDetails {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    accountName: str(o.accountName),
    bankName: str(o.bankName),
    accountNumber: str(o.accountNumber),
    ifsc: str(o.ifsc).toUpperCase(),
    branch: str(o.branch),
    upiId: str(o.upiId),
  };
}

export function sanitizeInvoicePrefix(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'MDH-INV';
}

export function bankDetailsConfigured(bank: InvoiceBankDetails): boolean {
  return Boolean(
    bank.accountName ||
    bank.bankName ||
    bank.accountNumber ||
    bank.ifsc ||
    bank.branch ||
    bank.upiId,
  );
}

export function parseInvoiceConfig(raw: unknown): InvoiceConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const nestedBank = o.bank && typeof o.bank === 'object' ? o.bank : o;
  return {
    prefix: sanitizeInvoicePrefix(str(o.prefix, DEFAULT_INVOICE_CONFIG.prefix)),
    dueDays: Math.max(0, Math.min(365, Math.round(num(o.dueDays, DEFAULT_INVOICE_CONFIG.dueDays)))),
    defaultPaymentTerms: str(o.defaultPaymentTerms, DEFAULT_INVOICE_CONFIG.defaultPaymentTerms),
    taxEnabled: bool(o.taxEnabled, DEFAULT_INVOICE_CONFIG.taxEnabled),
    taxType: taxType(o.taxType, DEFAULT_INVOICE_CONFIG.taxType),
    taxRate: Math.max(0, Math.min(100, num(o.taxRate, DEFAULT_INVOICE_CONFIG.taxRate))),
    showBankDetails: bool(o.showBankDetails, DEFAULT_INVOICE_CONFIG.showBankDetails),
    showUpiQr: bool(o.showUpiQr, DEFAULT_INVOICE_CONFIG.showUpiQr),
    footer: str(o.footer, DEFAULT_INVOICE_CONFIG.footer),
    termsAndConditions: str(o.termsAndConditions),
    paymentInstructions: str(o.paymentInstructions),
    pan: str(o.pan).toUpperCase(),
    bank: parseBank(nestedBank),
  };
}
