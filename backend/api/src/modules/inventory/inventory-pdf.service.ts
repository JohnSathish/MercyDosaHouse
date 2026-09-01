import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = (() => {
  const loaded = require('pdfkit') as { default?: unknown } | ((opts?: unknown) => unknown);
  if (typeof loaded === 'function') return loaded;
  if (loaded && typeof loaded.default === 'function') return loaded.default;
  throw new Error('pdfkit did not export a PDFDocument constructor');
})() as typeof import('pdfkit');

const GREEN = '#14532D';
const GOLD = '#C9A227';
const MUTED = '#6B7280';
const TEXT = '#111827';

export type PurchaseOrderPdfInput = {
  poNumber: string;
  poDate: Date;
  expectedDeliveryDate?: Date | null;
  supplierName: string;
  supplierContact?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  supplierGst?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    rate: number;
    tax: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharge: number;
  otherCharges: number;
  grandTotal: number;
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    gstin?: string | null;
  };
  deliveryAddress?: string | null;
  logo?: Buffer | null;
};

@Injectable()
export class InventoryPdfService {
  async purchaseOrderPdf(input: PurchaseOrderPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const inr = (n: number) =>
        `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      if (input.logo) {
        try {
          doc.image(input.logo, 40, 36, { fit: [48, 48] });
        } catch {
          /* skip */
        }
      }
      const left = input.logo ? 98 : 40;
      doc.fillColor(GREEN).fontSize(16).font('Helvetica-Bold').text(input.business.name, left, 40);
      doc.fillColor(GOLD).fontSize(9).font('Helvetica').text('Purchase Order', left, 60);
      doc.fillColor(MUTED).fontSize(8);
      if (input.business.address) doc.text(input.business.address, left, 74, { width: 280 });
      const metaY = 40;
      doc.fillColor(TEXT).fontSize(11).font('Helvetica-Bold').text(input.poNumber, 360, metaY, {
        align: 'right',
        width: 195,
      });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(`Date: ${input.poDate.toLocaleDateString('en-IN')}`, 360, metaY + 16, {
          align: 'right',
          width: 195,
        });
      if (input.expectedDeliveryDate) {
        doc.text(
          `Expected: ${input.expectedDeliveryDate.toLocaleDateString('en-IN')}`,
          360,
          metaY + 28,
          { align: 'right', width: 195 },
        );
      }

      let y = 118;
      doc.fillColor(GREEN).fontSize(10).font('Helvetica-Bold').text('Supplier', 40, y);
      doc.fillColor(GREEN).text('Deliver to', 320, y);
      y += 14;
      doc.fillColor(TEXT).font('Helvetica').fontSize(9);
      doc.text(input.supplierName, 40, y, { width: 250 });
      doc.text(input.deliveryAddress || input.business.address || 'Mercy Dosa House', 320, y, {
        width: 235,
      });
      y += 12;
      if (input.supplierContact) {
        doc.fillColor(MUTED).text(input.supplierContact, 40, y);
        y += 11;
      }
      if (input.supplierPhone) {
        doc.text(input.supplierPhone, 40, y);
        y += 11;
      }
      if (input.supplierGst) {
        doc.text(`GSTIN: ${input.supplierGst}`, 40, y);
        y += 11;
      }

      y += 16;
      doc.rect(40, y, 515, 18).fill(GREEN);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      doc.text('Ingredient', 46, y + 5, { width: 180 });
      doc.text('Qty', 230, y + 5, { width: 50 });
      doc.text('Unit', 280, y + 5, { width: 50 });
      doc.text('Rate', 330, y + 5, { width: 70 });
      doc.text('Tax', 400, y + 5, { width: 50 });
      doc.text('Amount', 460, y + 5, { width: 90, align: 'right' });
      y += 22;
      doc.font('Helvetica').fillColor(TEXT).fontSize(8);
      for (const item of input.items) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        doc.text(item.name, 46, y, { width: 180 });
        doc.text(String(item.quantity), 230, y, { width: 50 });
        doc.text(item.unit, 280, y, { width: 50 });
        doc.text(inr(item.rate), 330, y, { width: 70 });
        doc.text(inr(item.tax), 400, y, { width: 50 });
        doc.text(inr(item.amount), 460, y, { width: 90, align: 'right' });
        y += 16;
      }

      y += 10;
      const totals = [
        ['Subtotal', input.subtotal],
        ['Discount', input.discount],
        ['Tax', input.tax],
        ['Delivery', input.deliveryCharge],
        ['Other', input.otherCharges],
        ['Grand Total', input.grandTotal],
      ] as const;
      for (const [label, val] of totals) {
        const bold = label === 'Grand Total';
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? GREEN : TEXT);
        doc.text(label, 360, y, { width: 90 });
        doc.text(inr(val), 450, y, { width: 100, align: 'right' });
        y += 14;
      }

      y += 12;
      if (input.paymentTerms) {
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('Payment terms', 40, y);
        y += 12;
        doc.font('Helvetica').fillColor(TEXT).text(input.paymentTerms, 40, y, { width: 515 });
        y += 18;
      }
      if (input.notes) {
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('Notes', 40, y);
        y += 12;
        doc.font('Helvetica').fillColor(TEXT).text(input.notes, 40, y, { width: 515 });
      }

      doc
        .fillColor(MUTED)
        .fontSize(7)
        .text('Mercy Dosa House — Purchase Order', 40, 800, { width: 515, align: 'center' });
      doc.end();
    });
  }
}
