import type { PaymentMethod, PosOrderType } from '@mdh/types';
import { PaymentMethod as PM } from '@mdh/types';

export interface PosTerminalSettings {
  branch: string;
  terminalName: string;
  businessDate: string;
  defaultOrderType: PosOrderType;
  defaultPaymentMethod: PaymentMethod;
  autoSelectTable: boolean;
  autoPrintPayment: boolean;
  autoPrintKot: boolean;
  autoOpenCashDrawer: boolean;
  enableBarcodeScanner: boolean;
  enableKeyboardShortcuts: boolean;
  enableSound: boolean;
  enableDarkMode: boolean;
  enableFullscreen: boolean;
  receiptFooterMessage: string;
  receiptHeaderText: string;
  receiptPaperWidth: '58mm' | '80mm';
  receiptShowQr: boolean;
  receiptShowGst: boolean;
  printCustomerCopy: boolean;
  printKitchenCopy: boolean;
  printDuplicateCopy: boolean;
  packingCharge: number;
  deliveryCharge: number;
  roundOff: boolean;
  serviceChargePercent: number;
  managerApprovalLimit: number;
  minOrderValue: number;
  requirePinVoid: boolean;
  requirePinDiscount: boolean;
  sessionTimeoutMinutes: number;
  enableKds: boolean;
  autoSendKot: boolean;
  kdsSoundAlerts: boolean;
  theme: 'default' | 'dark' | 'light';
  accentColor: string;
  fontSize: 'small' | 'normal' | 'large';
  compactMode: boolean;
  touchMode: boolean;
}

const STORAGE_KEY = 'mdh_pos_terminal_settings';

export const DEFAULT_TERMINAL_SETTINGS: PosTerminalSettings = {
  branch: 'Main Branch',
  terminalName: 'POS-1',
  businessDate: new Date().toISOString().slice(0, 10),
  defaultOrderType: 'DINE_IN',
  defaultPaymentMethod: PM.CASH,
  autoSelectTable: false,
  autoPrintPayment: false,
  autoPrintKot: false,
  autoOpenCashDrawer: false,
  enableBarcodeScanner: true,
  enableKeyboardShortcuts: true,
  enableSound: true,
  enableDarkMode: false,
  enableFullscreen: false,
  receiptFooterMessage: 'Thank You!\nVisit Again',
  receiptHeaderText: 'Mercy Dosa House',
  receiptPaperWidth: '80mm',
  receiptShowQr: true,
  receiptShowGst: true,
  printCustomerCopy: true,
  printKitchenCopy: true,
  printDuplicateCopy: false,
  packingCharge: 20,
  deliveryCharge: 30,
  roundOff: false,
  serviceChargePercent: 0,
  managerApprovalLimit: 500,
  minOrderValue: 0,
  requirePinVoid: true,
  requirePinDiscount: true,
  sessionTimeoutMinutes: 480,
  enableKds: true,
  autoSendKot: false,
  kdsSoundAlerts: true,
  theme: 'default',
  accentColor: '#14532D',
  fontSize: 'normal',
  compactMode: false,
  touchMode: false,
};

export function loadTerminalSettings(): PosTerminalSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_TERMINAL_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TERMINAL_SETTINGS };
    return { ...DEFAULT_TERMINAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TERMINAL_SETTINGS };
  }
}

export function saveTerminalSettings(settings: PosTerminalSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetTerminalSettings(): PosTerminalSettings {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_TERMINAL_SETTINGS };
}
