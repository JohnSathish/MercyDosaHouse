import type { PosBillDto, PosReceiptDto } from '@mdh/types';
import {
  formatCurrency,
  formatPackingLabel,
  PAYMENT_METHOD_LABELS,
  getReceiptQrCaption,
  getReceiptQrSubcaption,
} from '@mdh/utils';
import type { PosReceiptPrintSettings, ReceiptCopyType } from './receipt-settings';
import { COPY_LABELS } from './receipt-settings';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(left: string, right: string, bold = false) {
  return `<div class="row${bold ? ' bold' : ''}"><span class="l">${esc(left)}</span><span class="r">${esc(right)}</span></div>`;
}

function fontPx(size: PosReceiptPrintSettings['fontSize']) {
  if (size === 'small') return '11px';
  if (size === 'large') return '14px';
  return '12px';
}

export interface ThermalReceiptContext {
  bill: PosBillDto | PosReceiptDto;
  businessName: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  branchName?: string;
  cashierName?: string;
  settings: PosReceiptPrintSettings;
  copyType?: ReceiptCopyType;
  qrDataUrl?: string | null;
}

export function buildThermalReceiptBody(ctx: ThermalReceiptContext): string {
  const { bill, settings, copyType } = ctx;
  const dt = new Date(bill.createdAt);
  const dateStr = dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = dt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const orderType = bill.orderType.replace(/_/g, '-');
  const copyLabel = copyType ? COPY_LABELS[copyType] : null;
  const isDineIn = bill.orderType === 'DINE_IN';
  const displayPhone =
    bill.customerPhone && bill.customerPhone !== '0000000000' ? bill.customerPhone : '-';

  const items = bill.items
    .map((item) => {
      const name = `${item.quantity} x ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
      const unit = item.quantity > 1 ? ` @ ${formatCurrency(item.unitPrice)}` : '';
      const note = item.specialInstructions
        ? `<div class="note">${esc(item.specialInstructions)}</div>`
        : '';
      return `<div class="item"><div class="item-name">${esc(name)}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</div><div class="item-price">${formatCurrency(item.totalPrice)}</div>${note}</div>`;
    })
    .join('');

  const summary: string[] = [row('Subtotal', formatCurrency(bill.subtotal))];
  if (bill.packingCharge > 0) {
    summary.push(row(formatPackingLabel(bill.packedItemCount), formatCurrency(bill.packingCharge)));
  }
  if (bill.deliveryCharge > 0) {
    summary.push(row('Delivery', formatCurrency(bill.deliveryCharge)));
  }
  if (bill.discount > 0) {
    summary.push(row('Discount', `-${formatCurrency(bill.discount)}`));
  }
  if (settings.showGst && bill.taxAmount > 0) {
    summary.push(row('CGST', formatCurrency(bill.cgstAmount)));
    summary.push(row('SGST', formatCurrency(bill.sgstAmount)));
    summary.push(row('Tax Total', formatCurrency(bill.taxAmount)));
  }
  summary.push(row('TOTAL', formatCurrency(bill.grandTotal), true));

  const paymentBlock: string[] = [];
  if (settings.showPayment && bill.paymentMethod) {
    paymentBlock.push(
      `<p class="paid">Paid via ${esc(PAYMENT_METHOD_LABELS[bill.paymentMethod] ?? bill.paymentMethod)}</p>`,
    );
    if (bill.amountReceived != null && bill.amountReceived > 0) {
      paymentBlock.push(row('Received', formatCurrency(bill.amountReceived)));
    }
    if (bill.changeDue != null && bill.changeDue > 0) {
      paymentBlock.push(row('Change', formatCurrency(bill.changeDue)));
    }
  }

  const footerLines = (settings.footerMessage || 'Thank You!\nVisit Again')
    .split('\n')
    .map((l) => `<p class="footer-line">${esc(l)}</p>`)
    .join('');

  return `
    ${copyLabel ? `<p class="copy-label">${esc(copyLabel)}</p>` : ''}
    ${settings.showLogo && ctx.settings.logoUrl ? `<div class="logo"><img src="${esc(ctx.settings.logoUrl)}" alt="" /></div>` : ''}
    <h1 class="brand">${esc(ctx.businessName)}</h1>
    ${ctx.tagline ? `<p class="tagline">${esc(ctx.tagline)}</p>` : ''}
    ${ctx.branchName ? `<p class="branch">${esc(ctx.branchName)}</p>` : ''}
    ${settings.showGst && settings.gstNumber ? `<p class="meta">GSTIN: ${esc(settings.gstNumber)}</p>` : ''}
    ${settings.showAddress && ctx.address ? `<p class="meta addr">${esc(ctx.address)}</p>` : ''}
    ${ctx.phone ? `<p class="meta">Tel: ${esc(ctx.phone)}</p>` : ''}
    <div class="rule dashed"></div>
    ${row('Bill No', bill.orderNumber)}
    ${row('Date', dateStr)}
    ${row('Time', timeStr)}
    ${settings.showCashier && ctx.cashierName ? row('Cashier', ctx.cashierName) : ''}
    ${row('Order Type', orderType.toUpperCase())}
    ${isDineIn && bill.tableLabel ? row('Table', bill.tableLabel) : ''}
    ${isDineIn && bill.covers ? row('Guests', String(bill.covers)) : ''}
    ${
      settings.showCustomer
        ? `${row('Customer', bill.customerName)}${row('Phone', displayPhone)}`
        : ''
    }
    <div class="rule"></div>
    <div class="items">${items}</div>
    <div class="rule dashed"></div>
    <div class="summary">${summary.join('')}</div>
    ${paymentBlock.join('')}
    ${settings.showQr && ctx.qrDataUrl ? `<div class="qr"><img src="${ctx.qrDataUrl}" alt="QR" /><p class="qr-cap">${esc(getReceiptQrCaption(settings.upiId))}</p>${getReceiptQrSubcaption(settings.upiId) ? `<p class="qr-upi">${esc(getReceiptQrSubcaption(settings.upiId)!)}</p>` : ''}</div>` : ''}
    <div class="footer">${footerLines}</div>
    ${settings.websiteUrl ? `<p class="meta web">${esc(settings.websiteUrl)}</p>` : ''}
    ${ctx.whatsapp || ctx.phone ? `<p class="meta">${esc(ctx.whatsapp ?? ctx.phone ?? '')}</p>` : ''}
  `;
}

export function buildThermalReceiptDocument(ctx: ThermalReceiptContext): string {
  const width = ctx.settings.paperWidth;
  const fontSize = fontPx(ctx.settings.fontSize);
  const body = buildThermalReceiptBody(ctx);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Receipt ${esc(ctx.bill.orderNumber)}</title>
<style>
  @page { size: ${width} auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width};
    max-width: ${width};
    margin: 0 auto;
    padding: 2mm 3mm 4mm;
    background: #fff;
    color: #000;
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize};
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .logo { text-align: center; margin-bottom: 4px; }
  .logo img { width: 48px; height: 48px; object-fit: contain; }
  .brand { text-align: center; font-size: 1.15em; font-weight: 700; margin: 2px 0; }
  .tagline, .branch { text-align: center; font-size: 0.85em; opacity: 0.85; }
  .meta { text-align: center; font-size: 0.85em; word-break: break-word; }
  .addr { margin: 2px 0; }
  .copy-label { text-align: center; font-weight: 700; font-size: 0.9em; letter-spacing: 0.05em; margin-bottom: 4px; border: 1px dashed #000; padding: 2px; }
  .rule { border-top: 1px solid #000; margin: 6px 0; }
  .rule.dashed { border-top-style: dashed; }
  .row { display: flex; justify-content: space-between; gap: 4px; margin: 1px 0; }
  .row.bold { font-weight: 700; font-size: 1.1em; margin-top: 4px; padding-top: 4px; border-top: 1px solid #000; }
  .row .l { flex: 1; text-align: left; }
  .row .r { flex-shrink: 0; text-align: right; }
  .items { margin: 4px 0; }
  .item { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 6px; margin: 3px 0; align-items: flex-start; }
  .item-name { flex: 1; min-width: 55%; text-align: left; }
  .item-price { flex-shrink: 0; font-weight: 600; text-align: right; }
  .unit { display: block; font-size: 0.85em; opacity: 0.8; }
  .note { width: 100%; font-size: 0.85em; font-style: italic; opacity: 0.85; padding-left: 8px; }
  .summary { margin: 4px 0; }
  .paid { text-align: center; font-weight: 600; margin: 6px 0 2px; }
  .qr { text-align: center; margin: 8px 0 4px; }
  .qr img { width: 88px; height: 88px; }
  .qr-cap { font-size: 0.85em; margin-top: 4px; font-weight: 600; }
  .qr-upi { font-size: 0.75em; opacity: 0.85; margin-top: 2px; word-break: break-all; }
  .footer { text-align: center; margin-top: 8px; }
  .footer-line { font-weight: 600; margin: 2px 0; }
  .web { margin-top: 4px; }
</style></head><body>${body}</body></html>`;
}

export function buildKotDocument(ctx: {
  bill: PosBillDto;
  businessName: string;
  tableLabel?: string | null;
  cashierName?: string;
  paperWidth: '58mm' | '80mm';
}): string {
  const { bill, paperWidth } = ctx;
  const dt = new Date(bill.createdAt);
  const timeStr = dt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const items = bill.items
    .map(
      (item) =>
        `<div class="kot-item"><span class="qty">${item.quantity}x</span><span class="name">${esc(item.productName)}${item.variantName ? ` (${esc(item.variantName)})` : ''}</span>${item.specialInstructions ? `<div class="note">* ${esc(item.specialInstructions)}</div>` : ''}</div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>KOT ${esc(bill.orderNumber)}</title>
<style>
  @page { size: ${paperWidth} auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${paperWidth}; max-width: ${paperWidth}; margin: 0 auto;
    padding: 3mm; font-family: 'Courier New', monospace; font-size: 13px;
    background: #fff; color: #000; line-height: 1.3;
  }
  h1 { text-align: center; font-size: 16px; border: 2px solid #000; padding: 4px; margin-bottom: 6px; }
  .meta { margin: 2px 0; }
  .rule { border-top: 2px dashed #000; margin: 6px 0; }
  .kot-item { margin: 6px 0; }
  .qty { font-weight: 700; font-size: 1.2em; margin-right: 6px; }
  .name { font-weight: 600; }
  .note { margin-top: 2px; padding-left: 20px; font-style: italic; }
</style></head><body>
  <h1>KITCHEN ORDER</h1>
  <p class="meta"><strong>${esc(ctx.businessName)}</strong></p>
  <p class="meta">Order: ${esc(bill.orderNumber)} · ${timeStr}</p>
  ${bill.tokenNumber ? `<p class="meta">Token: #${bill.tokenNumber}</p>` : ''}
  ${ctx.tableLabel ? `<p class="meta">Table: ${esc(ctx.tableLabel)}</p>` : ''}
  ${ctx.cashierName ? `<p class="meta">By: ${esc(ctx.cashierName)}</p>` : ''}
  <p class="meta">Type: ${esc(bill.orderType.replace(/_/g, ' '))}</p>
  <div class="rule"></div>
  ${items}
  <div class="rule"></div>
  <p class="meta" style="text-align:center;font-weight:700;">--- END KOT ---</p>
</body></html>`;
}
