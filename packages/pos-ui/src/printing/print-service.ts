import type { PosBillDto } from '@mdh/types';
import {
  buildKotDocument,
  buildThermalReceiptDocument,
  type ThermalReceiptContext,
} from './thermal-receipt-html';
import type { PosReceiptPrintSettings, ReceiptCopyType } from './receipt-settings';
import { generateReceiptQrDataUrl } from './receipt-qr';

function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  if (!imgs.length) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  ).then(() => undefined);
}

export interface PrintThermalOptions {
  html: string;
  copies?: number;
  onComplete?: () => void;
}

/** Open isolated print window — never prints the POS UI. */
export function printHtmlDocument({ html, copies = 1, onComplete }: PrintThermalOptions): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=420,height=720,left=200,top=80');
  if (!printWindow) {
    onComplete?.();
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const runPrint = async () => {
    await waitForImages(printWindow.document);
    printWindow.focus();

    let printed = 0;
    const doPrint = () => {
      printed += 1;
      printWindow.print();
      if (printed >= copies) {
        printWindow.close();
        onComplete?.();
      } else {
        setTimeout(doPrint, 400);
      }
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(doPrint, 80);
    } else {
      printWindow.addEventListener('load', () => setTimeout(doPrint, 80), { once: true });
    }
  };

  void runPrint();
}

export async function printThermalReceipt(
  ctx: Omit<ThermalReceiptContext, 'qrDataUrl'> & { settings: PosReceiptPrintSettings },
  copyType: ReceiptCopyType = 'customer',
  copies?: number,
): Promise<void> {
  const qrDataUrl = await generateReceiptQrDataUrl(ctx.bill, ctx.settings);
  const html = buildThermalReceiptDocument({ ...ctx, qrDataUrl, copyType });
  const count = copies ?? ctx.settings.copies ?? 1;

  return new Promise((resolve) => {
    printHtmlDocument({ html, copies: count, onComplete: resolve });
  });
}

export async function buildReceiptPreviewHtml(
  ctx: Omit<ThermalReceiptContext, 'qrDataUrl'>,
): Promise<string> {
  const qrDataUrl = await generateReceiptQrDataUrl(ctx.bill, ctx.settings);
  return buildThermalReceiptDocument({ ...ctx, qrDataUrl, copyType: 'customer' });
}

export async function printKotSlip(options: {
  bill: PosBillDto;
  businessName: string;
  tableLabel?: string | null;
  cashierName?: string;
  paperWidth: '58mm' | '80mm';
  copies?: number;
}): Promise<void> {
  const html = buildKotDocument(options);
  return new Promise((resolve) => {
    printHtmlDocument({ html, copies: options.copies ?? 1, onComplete: resolve });
  });
}
