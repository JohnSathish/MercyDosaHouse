import { jsPDF } from 'jspdf';
import type { BusinessSettingsDto, OrderDto } from '@mdh/types';
import { BRAND, formatCurrency, formatPackingLabel, ORDER_STATUS_LABELS } from '@mdh/utils';
import { APP_URLS } from '@/lib/app-urls';

export type ReceiptBusiness = Pick<
  BusinessSettingsDto,
  'businessName' | 'tagline' | 'phone' | 'address' | 'gstNumber' | 'websiteUrl'
> & { logoUrl?: string | null };

const GREEN: [number, number, number] = [20, 83, 45];
const ORANGE: [number, number, number] = [245, 158, 11];
const INK: [number, number, number] = [31, 41, 55];

export function receiptPdfFilename(orderNumber: string) {
  const safe = String(orderNumber || 'order')
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Mercy-Dosa-House-${safe || 'order'}.pdf`;
}

export function receiptPaymentLabel(method?: string | null) {
  const raw = String(method ?? '').toUpperCase();
  if (raw === 'COD') return 'COD';
  if (raw === 'UPI') return 'UPI';
  if (raw === 'CASH') return 'CASH';
  if (
    raw === 'RAZORPAY' ||
    raw === 'CASHFREE' ||
    raw === 'CARD' ||
    raw === 'WALLET' ||
    raw === 'SPLIT'
  ) {
    return 'Online';
  }
  return method?.trim() || '—';
}

export function isDeliveryOrder(order: OrderDto) {
  const type = String(order.orderType ?? 'DELIVERY').toUpperCase();
  if (type.includes('DINE') || type.includes('TAKE') || type.includes('PICK')) return false;
  return true;
}

export function orderDiscount(order: OrderDto) {
  return Number(order.discountAmount ?? order.discount ?? 0);
}

export function resolveReceiptBusiness(
  settings?: ReceiptBusiness | null,
): Required<Pick<ReceiptBusiness, 'businessName' | 'tagline' | 'phone' | 'address'>> &
  ReceiptBusiness {
  const tagline = settings?.tagline?.trim();
  return {
    ...settings,
    businessName: settings?.businessName?.trim() || BRAND.name,
    tagline: tagline && tagline.toLowerCase() !== 'restaurant erp' ? tagline : BRAND.tagline,
    phone: settings?.phone?.trim() || '',
    address: settings?.address?.trim() || '',
    logoUrl: settings?.logoUrl ?? `${APP_URLS.website}/images/logo.png`,
  };
}

export function formatReceiptDateTime(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return { date, time };
}

async function loadImageDataUrl(url?: string | null): Promise<string | null> {
  if (!url || typeof window === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function packedCount(order: OrderDto) {
  return order.packedItemCount ?? order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function addHeader(
  doc: jsPDF,
  biz: ReturnType<typeof resolveReceiptBusiness>,
  logo: string | null,
  pageWidth: number,
  headerHeight: number,
) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, headerHeight - 1.4, pageWidth, 1.4, 'F');

  const hasLogo = Boolean(logo?.startsWith('data:image/'));
  const left = 8;
  if (hasLogo && logo) {
    const size = headerHeight - 8;
    try {
      doc.addImage(logo, 'PNG', left, 4, size, size);
    } catch {
      try {
        doc.addImage(logo, 'JPEG', left, 4, size, size);
      } catch {
        /* skip broken logo */
      }
    }
  }
  const textX = hasLogo ? left + headerHeight - 4 : pageWidth / 2;
  const align = hasLogo ? 'left' : 'center';
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(pageWidth > 100 ? 16 : 11);
  doc.text(biz.businessName, textX, 10, { align });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(pageWidth > 100 ? 9 : 7);
  doc.text(biz.tagline, textX, 16, { align });
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = doc.splitTextToSize(text || '—', maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

async function buildPdf(
  order: OrderDto,
  settings: ReceiptBusiness | null | undefined,
  format: 'thermal' | 'a4',
) {
  const biz = resolveReceiptBusiness(settings);
  const logo = await loadImageDataUrl(biz.logoUrl);
  const { date, time } = formatReceiptDateTime(order.createdAt);
  const discount = orderDiscount(order);
  const thermal = format === 'thermal';
  const pageWidth = thermal ? 80 : 210;
  const margin = thermal ? 5 : 16;
  const right = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = thermal ? 4.2 : 6;
  const headerHeight = thermal ? 22 : 28;

  const itemBlock = order.items.reduce((h, item) => {
    const name = `${item.quantity} × ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    return h + Math.max(1, Math.ceil(name.length / (thermal ? 28 : 70))) * lineHeight + 1;
  }, 0);
  const addressLen = (order.deliveryAddress || '').length;
  const pageHeight = thermal
    ? Math.max(150, 90 + itemBlock + Math.ceil(addressLen / 32) * lineHeight)
    : 297;

  const doc = new jsPDF({
    unit: 'mm',
    format: thermal ? [80, pageHeight] : 'a4',
    orientation: 'portrait',
  });

  addHeader(doc, biz, logo, pageWidth, headerHeight);
  let y = headerHeight + (thermal ? 6 : 10);
  doc.setTextColor(...INK);

  const kv = (label: string, value: string, boldValue = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(thermal ? 7 : 9);
    doc.text(label, margin, y);
    doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
    doc.setFontSize(thermal ? 8 : 10);
    const valueWidth = contentWidth * 0.58;
    const lines = doc.splitTextToSize(value || '—', valueWidth) as string[];
    doc.text(lines, right, y, { align: 'right' });
    y += Math.max(1, lines.length) * lineHeight;
  };

  const divider = () => {
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, right, y);
    y += thermal ? 3 : 4;
  };

  kv('Order No', order.orderNumber, true);
  kv('Date', date);
  kv('Time', time);
  kv('Status', ORDER_STATUS_LABELS[order.status] || order.status);
  divider();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(thermal ? 8 : 10);
  doc.text('Customer', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(thermal ? 8 : 10);
  y = writeWrapped(doc, order.customerName, margin, y, contentWidth, lineHeight);
  y = writeWrapped(doc, order.customerPhone, margin, y, contentWidth, lineHeight);
  if (isDeliveryOrder(order) && order.deliveryAddress?.trim()) {
    const addr = [order.deliveryAddress, order.deliveryLandmark].filter(Boolean).join(', ');
    y = writeWrapped(doc, addr, margin, y, contentWidth, lineHeight);
  }
  y += 1;
  divider();

  doc.setFont('helvetica', 'bold');
  doc.text('Items', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  for (const item of order.items) {
    const name = `${item.quantity} × ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    const price = formatCurrency(item.totalPrice);
    const nameWidth = contentWidth - (thermal ? 18 : 28);
    const nameLines = doc.splitTextToSize(name, nameWidth) as string[];
    doc.text(nameLines, margin, y);
    doc.text(price, right, y, { align: 'right' });
    if (!thermal) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`${item.quantity} × ${formatCurrency(item.unitPrice)}`, margin, y + 4.2);
      doc.setTextColor(...INK);
      doc.setFontSize(10);
      y += nameLines.length * lineHeight + 2;
    } else {
      y += nameLines.length * lineHeight;
    }
  }
  divider();

  kv('Subtotal', formatCurrency(order.subtotal));
  if (order.packingCharge > 0) {
    kv(formatPackingLabel(packedCount(order)), formatCurrency(order.packingCharge));
  }
  kv('Delivery charge', formatCurrency(order.deliveryCharge));
  if (discount > 0) {
    kv(
      order.discountName ? `Discount (${order.discountName})` : 'Discount',
      `-${formatCurrency(discount)}`,
    );
  }
  doc.setFont('helvetica', 'bold');
  kv('Grand Total', formatCurrency(order.grandTotal), true);
  divider();
  kv('Payment method', receiptPaymentLabel(order.paymentMethod));

  if (biz.phone || biz.address) {
    divider();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(thermal ? 7 : 9);
    if (biz.phone)
      y = writeWrapped(doc, `Contact: ${biz.phone}`, margin, y, contentWidth, lineHeight);
    if (biz.address) y = writeWrapped(doc, biz.address, margin, y, contentWidth, lineHeight);
  }

  y += thermal ? 4 : 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(thermal ? 7 : 10);
  doc.setTextColor(...GREEN);
  const footer = 'Thank you for ordering from Mercy Dosa House';
  doc.text(footer, pageWidth / 2, y, { align: 'center' });

  doc.setProperties({
    title: `Receipt ${order.orderNumber}`,
    subject: 'Customer order receipt',
    author: biz.businessName,
    creator: biz.businessName,
  });

  return doc;
}

export async function generateOrderReceiptPdf(
  order: OrderDto,
  settings?: ReceiptBusiness | null,
  format: 'thermal' | 'a4' = 'a4',
) {
  const doc = await buildPdf(order, settings, format);
  return doc.output('blob') as Blob;
}

export async function downloadOrderReceiptPdf(
  order: OrderDto,
  settings?: ReceiptBusiness | null,
  format: 'thermal' | 'a4' = 'a4',
) {
  const doc = await buildPdf(order, settings, format);
  doc.save(receiptPdfFilename(order.orderNumber));
}

export async function shareOrderReceipt(order: OrderDto, settings?: ReceiptBusiness | null) {
  const filename = receiptPdfFilename(order.orderNumber);
  const blob = await generateOrderReceiptPdf(order, settings, 'a4');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const text = `Receipt ${order.orderNumber} · ${formatCurrency(order.grandTotal)}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const canFiles =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
      if (canFiles) {
        await navigator.share({ title: `Receipt ${order.orderNumber}`, text, files: [file] });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.share({ title: `Receipt ${order.orderNumber}`, text });
      return;
    } catch {
      /* cancelled */
    }
  }

  await downloadOrderReceiptPdf(order, settings, 'a4');
}

export function buildReceiptPrintHtml(order: OrderDto, settings?: ReceiptBusiness | null) {
  const biz = resolveReceiptBusiness(settings);
  const { date, time } = formatReceiptDateTime(order.createdAt);
  const discount = orderDiscount(order);
  const packed = packedCount(order);
  const address = [order.deliveryAddress, order.deliveryLandmark].filter(Boolean).join(', ');
  const showAddress = isDeliveryOrder(order) && Boolean(address);
  const items = order.items
    .map((item) => {
      const name = `${item.quantity} × ${escapeHtml(item.productName)}${item.variantName ? ` (${escapeHtml(item.variantName)})` : ''}`;
      return `<div style="display:flex;justify-content:space-between;gap:8px;margin:6px 0;align-items:flex-start">
        <div style="min-width:0;word-break:break-word">${name}<div style="color:#6B7280;font-size:10px">${item.quantity} × ${formatCurrency(item.unitPrice)}</div></div>
        <strong style="white-space:nowrap">${formatCurrency(item.totalPrice)}</strong>
      </div>`;
    })
    .join('');
  const logo = biz.logoUrl
    ? `<img src="${escapeHtml(biz.logoUrl)}" alt="" style="width:44px;height:44px;border-radius:999px;background:#fff;object-fit:contain;padding:2px" />`
    : '';
  const discountRow =
    discount > 0
      ? printRow(
          order.discountName ? `Discount (${order.discountName})` : 'Discount',
          `-${formatCurrency(discount)}`,
        )
      : '';
  const packingRow =
    order.packingCharge > 0
      ? printRow(formatPackingLabel(packed), formatCurrency(order.packingCharge))
      : '';

  return `<article style="width:80mm;margin:0 auto;font-family:Segoe UI,system-ui,sans-serif;color:#1F2937;background:#FFF8E8">
    <header style="background:#14532D;color:#fff;padding:12px">
      <div style="display:flex;gap:8px;align-items:center">
        ${logo}
        <div>
          <div style="font-weight:800;font-size:14px">${escapeHtml(biz.businessName)}</div>
          <div style="color:#FDE68A;font-size:10px">${escapeHtml(biz.tagline)}</div>
        </div>
      </div>
      <div style="height:3px;background:#F59E0B;margin-top:8px"></div>
    </header>
    <div style="padding:12px;font-size:11px;line-height:1.35">
      ${printRow('Order No', order.orderNumber)}
      ${printRow('Date', date)}
      ${printRow('Time', time)}
      ${printRow('Status', ORDER_STATUS_LABELS[order.status] || order.status)}
      <hr style="border:none;border-top:1px dashed #14532D33;margin:8px 0" />
      <div style="font-weight:800;color:#14532D">Customer</div>
      <div style="font-weight:700;word-break:break-word">${escapeHtml(order.customerName)}</div>
      <div style="word-break:break-all">${escapeHtml(order.customerPhone)}</div>
      ${showAddress ? `<div style="word-break:break-word">${escapeHtml(address)}</div>` : ''}
      <hr style="border:none;border-top:1px dashed #14532D33;margin:8px 0" />
      <div style="font-weight:800;color:#14532D">Items</div>
      ${items}
      <hr style="border:none;border-top:1px dashed #14532D33;margin:8px 0" />
      ${printRow('Subtotal', formatCurrency(order.subtotal))}
      ${packingRow}
      ${printRow('Delivery charge', formatCurrency(order.deliveryCharge))}
      ${discountRow}
      ${printRow('Grand Total', formatCurrency(order.grandTotal))}
      ${printRow('Payment method', receiptPaymentLabel(order.paymentMethod))}
      ${
        biz.phone || biz.address
          ? `<hr style="border:none;border-top:1px dashed #14532D33;margin:8px 0" />
             ${biz.phone ? `<div>Contact: ${escapeHtml(biz.phone)}</div>` : ''}
             ${biz.address ? `<div style="word-break:break-word">${escapeHtml(biz.address)}</div>` : ''}`
          : ''
      }
      <p style="text-align:center;color:#14532D;font-weight:700;font-size:10px;margin-top:12px">
        Thank you for ordering from Mercy Dosa House ❤️
      </p>
    </div>
  </article>`;
}

function printRow(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;gap:12px;margin:3px 0">
    <span style="color:#4B5563">${escapeHtml(label)}</span>
    <strong style="text-align:right;word-break:break-word;max-width:58%">${escapeHtml(value)}</strong>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printOrderReceiptHtml(html: string, title: string) {
  const printWindow = window.open('', '_blank', 'width=420,height=760');
  if (!printWindow) throw new Error('Pop-up blocked. Allow pop-ups to print the receipt.');
  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      @media print {
        body { margin: 0; }
      }
      body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; background: #fff; color: #1F2937; }
      * { box-sizing: border-box; }
      img { max-width: 100%; }
    </style>
  </head>
  <body>${html}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  const run = () => {
    const imgs = Array.from(printWindow.document.images);
    const finish = () => {
      printWindow.print();
      printWindow.close();
    };
    if (!imgs.length) {
      finish();
      return;
    }
    let left = imgs.length;
    const done = () => {
      left -= 1;
      if (left <= 0) finish();
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  };
  if (printWindow.document.readyState === 'complete') run();
  else printWindow.addEventListener('load', run, { once: true });
}
