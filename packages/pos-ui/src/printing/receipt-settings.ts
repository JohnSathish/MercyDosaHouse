import type { BusinessSettingsDto } from '@mdh/types';

export type ReceiptPaperWidth = '58mm' | '80mm';
export type ReceiptFontSize = 'small' | 'normal' | 'large';
export type ReceiptCopyType = 'customer' | 'merchant' | 'kitchen';

export interface PosReceiptPrintSettings {
  showLogo: boolean;
  showQr: boolean;
  showGst: boolean;
  showAddress: boolean;
  showCustomer: boolean;
  showCashier: boolean;
  showPayment: boolean;
  footerMessage: string;
  fontSize: ReceiptFontSize;
  paperWidth: ReceiptPaperWidth;
  copies: number;
  autoPrintPayment: boolean;
  autoPrintKot: boolean;
  gstNumber?: string;
  websiteUrl?: string;
  logoUrl?: string;
  upiId?: string;
  upiPayeeName?: string;
}

export const DEFAULT_RECEIPT_PRINT_SETTINGS: PosReceiptPrintSettings = {
  showLogo: true,
  showQr: true,
  showGst: true,
  showAddress: true,
  showCustomer: true,
  showCashier: true,
  showPayment: true,
  footerMessage: 'Thank You!\nVisit Again',
  fontSize: 'normal',
  paperWidth: '80mm',
  copies: 1,
  autoPrintPayment: false,
  autoPrintKot: false,
};

export function mergeReceiptPrintSettings(
  business?: Partial<BusinessSettingsDto> | null,
  logoUrl?: string | null,
): PosReceiptPrintSettings {
  return {
    showLogo: business?.receiptShowLogo ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showLogo,
    showQr: business?.receiptShowQr ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showQr,
    showGst: business?.receiptShowGst ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showGst,
    showAddress: business?.receiptShowAddress ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showAddress,
    showCustomer: business?.receiptShowCustomer ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showCustomer,
    showCashier: business?.receiptShowCashier ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showCashier,
    showPayment: business?.receiptShowPayment ?? DEFAULT_RECEIPT_PRINT_SETTINGS.showPayment,
    footerMessage: business?.receiptFooterMessage ?? DEFAULT_RECEIPT_PRINT_SETTINGS.footerMessage,
    fontSize: business?.receiptFontSize ?? DEFAULT_RECEIPT_PRINT_SETTINGS.fontSize,
    paperWidth: business?.receiptPaperWidth ?? DEFAULT_RECEIPT_PRINT_SETTINGS.paperWidth,
    copies: business?.receiptCopies ?? DEFAULT_RECEIPT_PRINT_SETTINGS.copies,
    autoPrintPayment:
      business?.receiptAutoPrintPayment ?? DEFAULT_RECEIPT_PRINT_SETTINGS.autoPrintPayment,
    autoPrintKot: business?.receiptAutoPrintKot ?? DEFAULT_RECEIPT_PRINT_SETTINGS.autoPrintKot,
    gstNumber: business?.gstNumber ?? undefined,
    websiteUrl: business?.websiteUrl ?? undefined,
    logoUrl: logoUrl ?? undefined,
    upiId: business?.upiId ?? undefined,
    upiPayeeName: business?.businessName ?? undefined,
  };
}

export const COPY_LABELS: Record<ReceiptCopyType, string> = {
  customer: 'CUSTOMER COPY',
  merchant: 'MERCHANT COPY',
  kitchen: 'KITCHEN COPY',
};
