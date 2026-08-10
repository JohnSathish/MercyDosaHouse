import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import type { OrderDto, BusinessSettingsDto } from '@mdh/types';
import {
  BRAND,
  formatCurrency,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatPackingLabel,
  buildReceiptQrPayload,
  getReceiptQrCaption,
  getReceiptQrSubcaption,
} from '@mdh/utils';
import { RECEIPT_LOGO_BUNDLED_SRC, RECEIPT_LOGO_PATH } from '@/lib/brand-assets';

export { RECEIPT_LOGO_PATH } from '@/lib/brand-assets';
export { LAST_ORDER_KEY, saveLastOrder, loadLastOrder } from '@/lib/last-order';

export async function loadReceiptLogoDataUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const candidates = [
    RECEIPT_LOGO_BUNDLED_SRC,
    `${window.location.origin}${RECEIPT_LOGO_PATH}`,
    RECEIPT_LOGO_PATH,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) continue;
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      continue;
    }
  }

  return null;
}

export function getReceiptQrPayload(
  order: OrderDto,
  settings?: Pick<BusinessSettingsDto, 'upiId' | 'businessName' | 'websiteUrl'>,
): string {
  const trackBase =
    settings?.websiteUrl ||
    (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_WEBSITE_URL);
  return buildReceiptQrPayload({
    upiId: settings?.upiId,
    payeeName: settings?.businessName ?? BRAND.name,
    amount: order.grandTotal,
    orderNumber: order.orderNumber,
    note: `Order ${order.orderNumber}`,
    trackUrl: trackBase ? `${trackBase.replace(/\/$/, '')}/track/${order.orderNumber}` : undefined,
  });
}

export { getReceiptQrCaption, getReceiptQrSubcaption };

export async function generateQrDataUrl(text: string, size = 160): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: { dark: '#14532D', light: '#FFFFFF' },
  });
}

function formatReceiptDate(date: string | Date) {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function formatReceiptTime(date: string | Date) {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Estimate page height (mm) so footer/QR are never clipped. */
function estimateReceiptPageHeight(order: OrderDto): number {
  const lineHeight = 4.2;
  let y = 26;

  y += 3 * lineHeight + 3;
  y += lineHeight + 2 * lineHeight;
  y += Math.max(1, Math.ceil(order.deliveryAddress.length / 35)) * lineHeight + 4;

  y += lineHeight;
  for (const item of order.items) {
    const name = `${item.quantity} x ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    y += Math.max(1, Math.ceil(name.length / 35)) * lineHeight;
  }
  y += 3;

  let totalRows = 4;
  if (order.packingCharge > 0) totalRows += 1;
  if (order.discount > 0) totalRows += 1;
  y += totalRows * lineHeight + 3;

  y += 2 * lineHeight + 3;
  y += 28 + 4;
  y += 4 * lineHeight + 10;

  return Math.ceil(Math.max(y, 130));
}

export async function generateReceiptPdf(
  order: OrderDto,
  settings?: Pick<
    BusinessSettingsDto,
    'phone' | 'businessName' | 'tagline' | 'upiId' | 'websiteUrl'
  >,
  qrDataUrl?: string,
): Promise<Blob> {
  const qr = qrDataUrl ?? (await generateQrDataUrl(getReceiptQrPayload(order, settings)));
  const logoDataUrl = await loadReceiptLogoDataUrl();
  const businessName = settings?.businessName || BRAND.name;
  const tagline = settings?.tagline || 'Freshly Made South Indian Food';
  const phone = settings?.phone || order.customerPhone;

  const lineHeight = 4.2;
  const pageHeight = estimateReceiptPageHeight(order);
  const doc = new jsPDF({ unit: 'mm', format: [80, pageHeight], orientation: 'portrait' });

  let y = 6;
  const center = 40;
  const left = 5;
  const right = 75;

  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, 80, 22, 'F');
  doc.setTextColor(255, 255, 255);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', left, 3, 14, 14);
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, logoDataUrl ? left + 17 : center, y + 4, {
    align: logoDataUrl ? 'left' : 'center',
  });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(tagline, logoDataUrl ? left + 17 : center, y + 9, {
    align: logoDataUrl ? 'left' : 'center',
  });

  y = 26;
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(8);

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(label, left, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.text(value, right, y, { align: 'right' });
    y += lineHeight;
  };

  const divider = () => {
    doc.setDrawColor(229, 231, 235);
    doc.line(left, y, right, y);
    y += 3;
  };

  row('Order No', order.orderNumber);
  row('Date', formatReceiptDate(order.createdAt));
  row('Time', formatReceiptTime(order.createdAt));
  divider();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Customer', left, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(order.customerName, left, y);
  y += lineHeight;
  doc.text(order.customerPhone, left, y);
  y += lineHeight;
  const addressLines = doc.splitTextToSize(order.deliveryAddress, 70);
  doc.text(addressLines, left, y);
  y += addressLines.length * lineHeight + 1;
  divider();

  doc.setFont('helvetica', 'bold');
  doc.text('Items', left, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  for (const item of order.items) {
    const name = `${item.quantity} x ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    const price = formatCurrency(item.totalPrice);
    const nameLines = doc.splitTextToSize(name, 52);
    doc.text(nameLines, left, y);
    doc.text(price, right, y, { align: 'right' });
    y += nameLines.length * lineHeight;
  }
  divider();

  row('Subtotal', formatCurrency(order.subtotal));
  row('Delivery', formatCurrency(order.deliveryCharge));
  if (order.packingCharge > 0) {
    row(
      formatPackingLabel(order.packedItemCount ?? order.items.reduce((s, i) => s + i.quantity, 0)),
      formatCurrency(order.packingCharge),
    );
  }
  if (order.discount > 0) row('Discount', `-${formatCurrency(order.discount)}`);
  doc.setFont('helvetica', 'bold');
  row('TOTAL', formatCurrency(order.grandTotal), true);
  divider();

  row('Payment', PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod);
  row('Order Status', ORDER_STATUS_LABELS[order.status] || order.status);
  divider();

  const qrSize = 28;
  doc.addImage(qr, 'PNG', center - qrSize / 2, y, qrSize, qrSize);
  y += qrSize + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Thank You!', center, y, { align: 'center' });
  y += lineHeight;
  doc.text('Visit Again', center, y, { align: 'center' });
  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, center, y, { align: 'center' });
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(phone, center, y, { align: 'center' });

  return doc.output('blob');
}

export async function downloadReceiptPdf(
  order: OrderDto,
  settings?: Pick<
    BusinessSettingsDto,
    'phone' | 'businessName' | 'tagline' | 'upiId' | 'websiteUrl'
  >,
) {
  const blob = await generateReceiptPdf(order, settings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${order.orderNumber}-receipt.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareReceipt(order: OrderDto) {
  const text = `Order ${order.orderNumber} from Mercy Dosa House — Total ${formatCurrency(order.grandTotal)}. Track: ${typeof window !== 'undefined' ? window.location.origin : ''}/track/${order.orderNumber}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = await generateReceiptPdf(order);
      const file = new File([blob], `${order.orderNumber}-receipt.pdf`, {
        type: 'application/pdf',
      });
      await navigator.share({
        title: `Receipt ${order.orderNumber}`,
        text,
        files: [file],
      });
      return;
    } catch {
      // fall through to text share
    }
    try {
      await navigator.share({ title: `Receipt ${order.orderNumber}`, text });
      return;
    } catch {
      // user cancelled
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function printReceipt(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (!printWindow) return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let html = el.innerHTML.replace(/src="\/images\/logo\.png"/g, `src="${origin}/images/logo.png"`);
  html = html.replace(/src="(\/_next\/static\/media\/[^"]+)"/g, `src="${origin}$1"`);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; background: #fff; color: #1F2937; }
          * { box-sizing: border-box; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  const printWhenReady = () => {
    const imgs = Array.from(printWindow.document.images);
    if (imgs.length === 0) {
      printWindow.print();
      printWindow.close();
      return;
    }

    let pending = imgs.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        printWindow.print();
        printWindow.close();
      }
    };

    for (const img of imgs) {
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    }
  };

  if (printWindow.document.readyState === 'complete') {
    printWhenReady();
  } else {
    printWindow.addEventListener('load', printWhenReady, { once: true });
  }
}
