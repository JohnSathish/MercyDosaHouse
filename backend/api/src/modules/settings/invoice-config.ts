export type InvoiceTaxType = 'NONE' | 'CGST_SGST' | 'IGST' | 'OTHER';

export type InvoiceBankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

export type InvoiceEmailSettings = {
  autoSend: boolean;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  phone: string;
  address: string;
  website: string;
  logoUrl: string;
  subject: string;
  overdueSubject: string;
  footer: string;
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
  email: InvoiceEmailSettings;
};

export const EMPTY_BANK_DETAILS: InvoiceBankDetails = {
  accountName: 'JOHN SATHISH SOUNDARARAJAN',
  bankName: 'SBI',
  accountNumber: '20261463610',
  ifsc: 'SBIN0007332',
  branch: 'CHANDMARI',
  upiId: '',
};

export const DEFAULT_INVOICE_EMAIL: InvoiceEmailSettings = {
  autoSend: false,
  senderName: 'Mercy Dosa House',
  senderEmail: '',
  replyTo: '',
  phone: '',
  address: '',
  website: '',
  logoUrl: '',
  subject: 'Invoice {{invoice_number}} | Mercy Dosa House',
  overdueSubject: 'Payment Reminder — Invoice {{invoice_number}} | Mercy Dosa House',
  footer: 'Thank you for your trust and continued support!',
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
  footer: 'Thank you for choosing Mercy Dosa House.',
  termsAndConditions: '',
  paymentInstructions: '',
  pan: '',
  bank: { ...EMPTY_BANK_DETAILS },
  email: { ...DEFAULT_INVOICE_EMAIL },
};

function str(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
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
    accountName: str(o.accountName, EMPTY_BANK_DETAILS.accountName),
    bankName: str(o.bankName, EMPTY_BANK_DETAILS.bankName),
    accountNumber: str(o.accountNumber, EMPTY_BANK_DETAILS.accountNumber),
    ifsc: str(o.ifsc, EMPTY_BANK_DETAILS.ifsc).toUpperCase(),
    branch: str(o.branch, EMPTY_BANK_DETAILS.branch),
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

function parseEmail(raw: unknown): InvoiceEmailSettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    autoSend: bool(o.autoSend, DEFAULT_INVOICE_EMAIL.autoSend),
    senderName: str(o.senderName, DEFAULT_INVOICE_EMAIL.senderName),
    senderEmail: str(o.senderEmail).toLowerCase(),
    replyTo: str(o.replyTo).toLowerCase(),
    phone: str(o.phone),
    address: str(o.address),
    website: str(o.website),
    logoUrl: str(o.logoUrl),
    subject: str(o.subject, DEFAULT_INVOICE_EMAIL.subject),
    overdueSubject: str(o.overdueSubject, DEFAULT_INVOICE_EMAIL.overdueSubject),
    footer: str(o.footer, DEFAULT_INVOICE_EMAIL.footer),
  };
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
    email: parseEmail(o.email),
  };
}
