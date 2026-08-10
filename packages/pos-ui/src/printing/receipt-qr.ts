import { buildReceiptQrPayload } from '@mdh/utils';
import type { PosBillDto, PosReceiptDto } from '@mdh/types';
import type { PosReceiptPrintSettings } from './receipt-settings';

let qrModule: typeof import('qrcode') | null = null;

export async function generateReceiptQrDataUrl(
  bill: PosBillDto | PosReceiptDto,
  settings: PosReceiptPrintSettings,
): Promise<string | null> {
  if (!settings.showQr) return null;
  try {
    if (!qrModule) qrModule = await import('qrcode');
    const payload = buildReceiptQrPayload({
      upiId: settings.upiId,
      payeeName: settings.upiPayeeName,
      amount: bill.grandTotal,
      orderNumber: bill.orderNumber,
      note: `Bill ${bill.orderNumber}`,
      trackUrl: settings.websiteUrl
        ? `${settings.websiteUrl.replace(/\/$/, '')}/track/${bill.orderNumber}`
        : undefined,
    });
    return await qrModule.toDataURL(payload, {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch {
    return null;
  }
}
