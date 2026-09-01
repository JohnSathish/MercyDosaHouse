import { Injectable, Logger } from '@nestjs/common';
import type { InvoiceConfig } from '../settings/invoice-config';
import { bankDetailsConfigured } from '../settings/invoice-config';
import { amountInWordsInr } from './invoice-totals';

/* pdfkit is CommonJS. Default import compiles to `.default`, which is not a constructor. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = (() => {
  const loaded = require('pdfkit') as { default?: unknown } | ((opts?: unknown) => unknown);
  if (typeof loaded === 'function') return loaded;
  if (loaded && typeof loaded.default === 'function') return loaded.default;
  throw new Error('pdfkit did not export a PDFDocument constructor');
})() as typeof import('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode') as typeof import('qrcode');

const GREEN = '#14532D';
const GOLD = '#C9A227';
const MUTED = '#6B7280';
const TEXT = '#111827';
const LINE = '#E5E7EB';

export type InvoicePdfPayload = {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customerType: string;
  customerName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  gstin?: string | null;
  pan?: string | null;
  referenceNumber?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  items: {
    description: string;
    notes?: string | null;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  discountAmount: number;
  discountLabel?: string | null;
  deliveryCharge: number;
  packingCharge: number;
  otherCharges: number;
  otherChargesLabel?: string | null;
  taxEnabled: boolean;
  taxType: string;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  payments: { method: string; amount: number; paidAt: Date; reference?: string | null }[];
  business: {
    name: string;
    tagline?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    gstin?: string | null;
    fssai?: string | null;
    pan?: string | null;
  };
  config: InvoiceConfig;
  logo?: Buffer | null;
};

/** Helvetica/WinAnsi cannot encode ₹ or emoji — that throws and returns HTTP 500. */
function winAnsi(value: string): string {
  return value.replace(/₹/g, 'Rs.').replace(/[^\t\n\r\u0020-\u007E\u00A0-\u00FF]/g, '');
}

function patchWinAnsi(doc: PDFKit.PDFDocument) {
  const text = doc.text.bind(doc);
  doc.text = ((
    str: string,
    x?: number | PDFKit.Mixins.TextOptions,
    y?: number,
    options?: PDFKit.Mixins.TextOptions,
  ) => {
    const safe = winAnsi(String(str ?? ''));
    if (typeof x === 'object') return text(safe, x);
    return text(safe, x, y, options);
  }) as typeof doc.text;
  const heightOfString = doc.heightOfString.bind(doc);
  doc.heightOfString = ((str: string, options?: PDFKit.Mixins.TextOptions) =>
    heightOfString(winAnsi(String(str ?? '')), options)) as typeof doc.heightOfString;
}

function inr(n: number): string {
  const amount = n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${amount}`;
}

function fmtDate(d: Date): string {
  try {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    UNPAID: 'Unpaid',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status;
}

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  async render(raw: InvoicePdfPayload): Promise<Buffer> {
    try {
      return await this.renderFull(raw);
    } catch (err) {
      this.logger.error(
        `Invoice PDF render failed, using simple fallback: ${err instanceof Error ? err.message : err}`,
      );
      return this.renderFallback(raw);
    }
  }

  private async renderFull(raw: InvoicePdfPayload): Promise<Buffer> {
    const payload = this.sanitize(raw);
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `Invoice ${payload.invoiceNumber}`,
        Author: payload.business.name,
      },
    });
    patchWinAnsi(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.drawHeader(doc, payload);
    let y = 136;
    y = this.drawMetaAndParties(doc, payload, y);
    y = this.drawItems(doc, payload, y);
    y = this.drawTotals(doc, payload, y);
    await this.drawPaymentBankAndQr(doc, payload, y);
    this.drawFooterCopy(doc, payload);
    this.addPageNumbers(doc);
    doc.end();
    return done;
  }

  private renderFallback(raw: InvoicePdfPayload): Promise<Buffer> {
    const payload = this.sanitize(raw);
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    patchWinAnsi(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    doc.font('Helvetica-Bold').fontSize(18).text(payload.business.name);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(12).text(`Invoice ${payload.invoiceNumber}`);
    doc.text(`Date: ${fmtDate(payload.invoiceDate)}`);
    doc.text(`Bill to: ${payload.customerName}`);
    doc.moveDown();
    payload.items.forEach((item, i) => {
      doc.text(`${i + 1}. ${item.description}  x${item.quantity}  ${inr(item.amount)}`);
    });
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Grand total: ${inr(payload.grandTotal)}`);
    doc.font('Helvetica').text(`Amount paid: ${inr(payload.amountPaid)}`);
    doc.text(`Balance due: ${inr(payload.balanceDue)}`);
    doc.end();
    return done;
  }

  private sanitize(payload: InvoicePdfPayload): InvoicePdfPayload {
    const s = (value?: string | null) => (value == null ? value : winAnsi(value));
    return {
      ...payload,
      invoiceNumber: winAnsi(payload.invoiceNumber),
      customerType: winAnsi(payload.customerType),
      customerName: winAnsi(payload.customerName),
      contactPerson: s(payload.contactPerson),
      phone: s(payload.phone),
      email: s(payload.email),
      billingAddress: s(payload.billingAddress),
      deliveryAddress: s(payload.deliveryAddress),
      gstin: s(payload.gstin),
      pan: s(payload.pan),
      referenceNumber: s(payload.referenceNumber),
      paymentTerms: s(payload.paymentTerms),
      notes: s(payload.notes),
      discountLabel: s(payload.discountLabel),
      otherChargesLabel: s(payload.otherChargesLabel),
      status: winAnsi(payload.status),
      items: payload.items.map((item) => ({
        ...item,
        description: winAnsi(item.description),
        notes: s(item.notes),
      })),
      payments: payload.payments.map((p) => ({
        ...p,
        method: winAnsi(p.method),
        reference: s(p.reference),
      })),
      business: {
        name: winAnsi(payload.business.name || 'Mercy Dosa House'),
        tagline: s(payload.business.tagline),
        address: s(payload.business.address),
        phone: s(payload.business.phone),
        email: s(payload.business.email),
        website: s(payload.business.website),
        gstin: s(payload.business.gstin),
        fssai: s(payload.business.fssai),
        pan: s(payload.business.pan),
      },
      config: {
        ...payload.config,
        footer: winAnsi(payload.config.footer || ''),
        termsAndConditions: winAnsi(payload.config.termsAndConditions || ''),
        paymentInstructions: winAnsi(payload.config.paymentInstructions || ''),
        pan: winAnsi(payload.config.pan || ''),
        bank: {
          ...payload.config.bank,
          accountName: winAnsi(payload.config.bank.accountName || ''),
          bankName: winAnsi(payload.config.bank.bankName || ''),
          accountNumber: winAnsi(payload.config.bank.accountNumber || ''),
          ifsc: winAnsi(payload.config.bank.ifsc || ''),
          branch: winAnsi(payload.config.bank.branch || ''),
          upiId: winAnsi(payload.config.bank.upiId || ''),
        },
      },
    };
  }

  private drawHeader(doc: PDFKit.PDFDocument, payload: InvoicePdfPayload) {
    doc.rect(0, 0, 595, 96).fill(GREEN);
    doc.rect(0, 96, 595, 3).fill(GOLD);

    if (payload.logo) {
      try {
        doc.image(payload.logo, 40, 18, { fit: [52, 52] });
      } catch {
        /* skip invalid logo */
      }
    }

    const left = payload.logo ? 104 : 40;
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(payload.business.name.toUpperCase(), left, 22, {
        width: 300,
      });
    const tag = payload.business.tagline || 'FOOD - QUALITY - TRUST';
    doc.font('Helvetica').fontSize(8).fillColor(GOLD).text(tag, left, 44, { width: 300 });

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text('INVOICE', 360, 22, {
      width: 195,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(10).fillColor(GOLD).text(payload.invoiceNumber, 360, 42, {
      width: 195,
      align: 'right',
    });
    doc.fontSize(8).fillColor('#D1FAE5').text(statusLabel(payload.status).toUpperCase(), 360, 58, {
      width: 195,
      align: 'right',
    });
  }

  private drawMetaAndParties(
    doc: PDFKit.PDFDocument,
    payload: InvoicePdfPayload,
    y: number,
  ): number {
    const seller = [
      payload.business.address,
      payload.business.phone ? `Phone: ${payload.business.phone}` : null,
      payload.business.email ? `Email: ${payload.business.email}` : null,
      payload.business.website ? payload.business.website : null,
      payload.business.fssai ? `FSSAI: ${payload.business.fssai}` : null,
      payload.business.gstin ? `GSTIN: ${payload.business.gstin}` : null,
      payload.business.pan ? `PAN: ${payload.business.pan}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9).text('SELLER', 40, y);
    doc
      .fillColor(TEXT)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(payload.business.name, 40, y + 14, { width: 250 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(seller || '—', 40, y + 28, { width: 250 });

    const bill = [
      payload.contactPerson ? `Contact: ${payload.contactPerson}` : null,
      payload.phone ? `Phone: ${payload.phone}` : null,
      payload.email ? `Email: ${payload.email}` : null,
      payload.billingAddress ? `Billing: ${payload.billingAddress}` : null,
      payload.deliveryAddress && payload.deliveryAddress !== payload.billingAddress
        ? `Delivery: ${payload.deliveryAddress}`
        : null,
      payload.gstin ? `GSTIN: ${payload.gstin}` : null,
      payload.pan ? `PAN: ${payload.pan}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9).text('BILL TO', 310, y);
    doc
      .fillColor(TEXT)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(payload.customerName, 310, y + 14, { width: 245 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(bill || '—', 310, y + 28, { width: 245 });

    const sellerH = doc.heightOfString(seller || '—', { width: 250 }) + 44;
    const billH = doc.heightOfString(bill || '—', { width: 245 }) + 44;
    y += Math.max(sellerH, billH, 90);

    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    doc.text(`Invoice Date: ${fmtDate(payload.invoiceDate)}`, 40, y);
    doc.text(`Due Date: ${fmtDate(payload.dueDate)}`, 200, y);
    if (payload.referenceNumber) doc.text(`Reference: ${payload.referenceNumber}`, 360, y);
    y += 14;
    if (payload.paymentTerms) {
      doc.text(`Payment Terms: ${payload.paymentTerms}`, 40, y);
      y += 14;
    }
    return y + 8;
  }

  private drawItems(doc: PDFKit.PDFDocument, payload: InvoicePdfPayload, y: number): number {
    const cols = { no: 40, desc: 68, qty: 330, rate: 400, amt: 470 };
    const headerH = 22;
    doc.rect(40, y, 515, headerH).fill(GREEN);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    doc.text('#', cols.no + 4, y + 7, { width: 20 });
    doc.text('Description', cols.desc, y + 7, { width: 250 });
    doc.text('Qty', cols.qty, y + 7, { width: 60, align: 'right' });
    doc.text('Rate', cols.rate, y + 7, { width: 60, align: 'right' });
    doc.text('Amount', cols.amt, y + 7, { width: 80, align: 'right' });
    y += headerH;

    payload.items.forEach((item, i) => {
      const desc = item.notes ? `${item.description}\n${item.notes}` : item.description;
      const h = Math.max(22, doc.heightOfString(desc, { width: 250 }) + 10);
      y = this.ensureSpace(doc, y, h + 20);
      if (i % 2 === 1) doc.rect(40, y, 515, h).fill('#F9FAFB');
      doc.fillColor(TEXT).font('Helvetica').fontSize(8);
      doc.text(String(i + 1), cols.no + 4, y + 6, { width: 20 });
      doc.text(desc, cols.desc, y + 6, { width: 250 });
      doc.text(String(item.quantity), cols.qty, y + 6, { width: 60, align: 'right' });
      doc.text(inr(item.unitPrice), cols.rate, y + 6, { width: 60, align: 'right' });
      doc
        .font('Helvetica-Bold')
        .text(inr(item.amount), cols.amt, y + 6, { width: 80, align: 'right' });
      y += h;
    });

    doc.moveTo(40, y).lineTo(555, y).strokeColor(LINE).lineWidth(1).stroke();
    return y + 10;
  }

  private drawTotals(doc: PDFKit.PDFDocument, payload: InvoicePdfPayload, y: number): number {
    y = this.ensureSpace(doc, y, 90);
    const row = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(bold ? GREEN : MUTED);
      doc.text(label, 330, y, { width: 110 });
      doc.fillColor(bold ? GREEN : TEXT).text(value, 440, y, { width: 115, align: 'right' });
      y += 14;
    };
    row('Subtotal', inr(payload.subtotal));
    if (payload.discountAmount > 0) {
      row(payload.discountLabel || 'Discount', `-${inr(payload.discountAmount)}`);
    }
    if (payload.deliveryCharge > 0) row('Delivery Charges', inr(payload.deliveryCharge));
    if (payload.packingCharge > 0) row('Packing Charges', inr(payload.packingCharge));
    if (payload.otherCharges > 0)
      row(payload.otherChargesLabel || 'Other Charges', inr(payload.otherCharges));
    if (payload.taxEnabled && payload.taxAmount > 0) {
      if (payload.taxType === 'CGST_SGST') {
        row(`CGST (${payload.taxRate / 2}%)`, inr(payload.cgstAmount));
        row(`SGST (${payload.taxRate / 2}%)`, inr(payload.sgstAmount));
      } else if (payload.taxType === 'IGST') {
        row(`IGST (${payload.taxRate}%)`, inr(payload.igstAmount));
      } else {
        row(`Tax (${payload.taxRate}%)`, inr(payload.taxAmount));
      }
    }
    doc.moveTo(330, y).lineTo(555, y).strokeColor(GOLD).lineWidth(1.2).stroke();
    y += 8;
    row('GRAND TOTAL', inr(payload.grandTotal), true);
    y += 6;
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Amount in Words: ${winAnsi(amountInWordsInr(payload.grandTotal))}`, 40, y, {
        width: 515,
      });
    return y + 16;
  }

  private async drawPaymentBankAndQr(
    doc: PDFKit.PDFDocument,
    payload: InvoicePdfPayload,
    y: number,
  ): Promise<number> {
    const bank = payload.config.bank;
    const showBank = payload.config.showBankDetails && bankDetailsConfigured(bank);
    const showQr =
      payload.config.showUpiQr &&
      Boolean(bank.upiId?.trim()) &&
      payload.status !== 'PAID' &&
      payload.status !== 'CANCELLED';

    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9).text('PAYMENT DETAILS', 40, y);
    y += 12;
    const lastMethod = payload.payments[payload.payments.length - 1]?.method;
    doc.font('Helvetica').fontSize(8).fillColor(TEXT);
    doc.text(`Status: ${statusLabel(payload.status)}`, 40, y);
    if (lastMethod) doc.text(`Last payment method: ${lastMethod.replace(/_/g, ' ')}`, 200, y);
    y += 11;
    doc.text(`Amount Paid: ${inr(payload.amountPaid)}`, 40, y);
    doc.text(`Balance Due: ${inr(payload.balanceDue)}`, 200, y);
    y += 16;

    const blockTop = y;
    if (showBank) {
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9).text('BANK DETAILS', 40, y);
      y += 12;
      const lines = [
        bank.accountName && `Account Holder: ${bank.accountName}`,
        bank.bankName && `Bank: ${bank.bankName}`,
        bank.accountNumber && `Account No.: ${bank.accountNumber}`,
        bank.branch && `Branch: ${bank.branch}`,
        bank.ifsc && `IFSC: ${bank.ifsc}`,
        bank.upiId && `UPI: ${bank.upiId}`,
      ].filter(Boolean) as string[];
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(TEXT)
        .text(lines.join('\n'), 40, y, { width: showQr ? 360 : 515, lineGap: 1 });
      y += lines.length * 11 + 6;
    }
    if (payload.config.paymentInstructions) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(payload.config.paymentInstructions, 40, y, { width: 360 });
      y += 14;
    }

    if (showQr) {
      try {
        const am = payload.balanceDue > 0 ? payload.balanceDue : payload.grandTotal;
        const url = `upi://pay?pa=${encodeURIComponent(bank.upiId.trim())}&pn=${encodeURIComponent(
          payload.business.name,
        )}&am=${am.toFixed(2)}&cu=INR&tn=${encodeURIComponent(payload.invoiceNumber)}`;
        const png = await QRCode.toBuffer(url, { type: 'png', margin: 1, width: 110 });
        doc.image(png, 445, blockTop, { fit: [78, 78] });
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(MUTED)
          .text('Scan to Pay', 445, blockTop + 80, { width: 78, align: 'center' });
        y = Math.max(y, blockTop + 96);
      } catch (err) {
        this.logger.warn(`UPI QR skipped: ${err instanceof Error ? err.message : 'error'}`);
      }
    }
    return y;
  }

  private drawFooterCopy(doc: PDFKit.PDFDocument, payload: InvoicePdfPayload) {
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      const footerY = 812;
      doc.save();
      doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(GOLD).lineWidth(0.8).stroke();
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(GREEN)
        .text(payload.config.footer || '', 40, footerY + 6, {
          width: 515,
          align: 'center',
          lineBreak: false,
        });
      doc
        .fontSize(7)
        .fillColor(MUTED)
        .text(
          'This is a computer-generated invoice and does not require a physical signature.',
          40,
          footerY + 18,
          { width: 515, align: 'center', lineBreak: false },
        );
      doc.restore();
    }
  }

  private addPageNumbers(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    if (range.count <= 1) return;
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(MUTED)
        .text(`Page ${i + 1} of ${range.count}`, 40, 828, {
          width: 515,
          align: 'right',
          lineBreak: false,
        });
    }
  }

  private ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
    if (y + needed > 800) {
      doc.addPage({ size: 'A4', margin: 0 });
      return 36;
    }
    return y;
  }
}
