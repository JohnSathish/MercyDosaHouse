import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  InvoiceCustomerType,
  InvoiceDiscountType,
  InvoicePaymentMethod,
  InvoiceStatus,
  InvoiceTaxType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type {
  CreateInvoiceRequest,
  InvoiceDto,
  InvoiceListItemDto,
  InvoiceStatsDto,
  RecordInvoicePaymentRequest,
} from '@mdh/types';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '../../common/guards';
import {
  DEFAULT_INVOICE_CONFIG,
  parseInvoiceConfig,
  type InvoiceConfig,
} from '../settings/invoice-config';
import {
  resolvePublicAssetUrl,
  resolveWebsiteUrl,
  formatFromHeader,
} from '../notifications/email-branding';
import { computeInvoiceTotals } from './compute-totals';
import { amountInWordsInr } from './invoice-totals';
import { InvoicePdfService } from './invoice-pdf.service';
import {
  formatPdfFileSize,
  renderInvoiceEmail,
  renderInvoiceEmailSubject,
  type InvoiceEmailKind,
} from './invoice-email.template';

const CUSTOMER_TYPES = new Set(Object.values(InvoiceCustomerType));
const PAY_METHODS = new Set(Object.values(InvoicePaymentMethod));
const TAX_TYPES = new Set(Object.values(InvoiceTaxType));

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: {
    items: true;
    payments: { include: { recordedBy: { select: { name: true } } } };
    events: true;
    createdBy: { select: { name: true } };
    order: { select: { orderNumber: true; userId: true } };
  };
}>;

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private audit: AuditService,
    private pdf: InvoicePdfService,
    private config: ConfigService,
  ) {}

  async getInvoiceConfig(): Promise<InvoiceConfig> {
    const settings = await this.ensureSettings();
    const parsed = parseInvoiceConfig(settings.invoiceConfig);
    if (!parsed.bank.upiId && settings.upiId) {
      parsed.bank.upiId = settings.upiId;
    }
    return parsed;
  }

  async updateInvoiceConfig(patch: Record<string, unknown>): Promise<InvoiceConfig> {
    const settings = await this.ensureSettings();
    const current = parseInvoiceConfig(settings.invoiceConfig);
    const next = parseInvoiceConfig({
      ...current,
      ...patch,
      bank: {
        ...current.bank,
        ...(patch.bank && typeof patch.bank === 'object' ? patch.bank : {}),
      },
      email: {
        ...current.email,
        ...(patch.email && typeof patch.email === 'object' ? patch.email : {}),
      },
    });
    await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: { invoiceConfig: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }

  async stats(): Promise<InvoiceStatsDto> {
    await this.markOverdue();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const notCancelled: Prisma.InvoiceWhereInput = { status: { not: 'CANCELLED' } };

    const [today, month, pending, paidCount, outstanding] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { ...notCancelled, invoiceDate: { gte: startOfDay } },
        _sum: { grandTotal: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...notCancelled, invoiceDate: { gte: startOfMonth } },
        _sum: { grandTotal: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balanceDue: true },
      }),
      this.prisma.invoice.count({ where: { status: 'PAID' } }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balanceDue: true },
      }),
    ]);

    return {
      todayTotal: Number(today._sum.grandTotal ?? 0),
      monthTotal: Number(month._sum.grandTotal ?? 0),
      pendingPayment: Number(pending._sum.balanceDue ?? 0),
      paidCount,
      outstanding: Number(outstanding._sum.balanceDue ?? 0),
    };
  }

  async list(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }) {
    await this.markOverdue();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const where: Prisma.InvoiceWhereInput = {};
    if (query.status && query.status !== 'all') {
      where.status = query.status as InvoiceStatus;
    }
    if (query.from || query.to) {
      where.invoiceDate = {};
      if (query.from) where.invoiceDate.gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = to;
      }
    }
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows.map((row) => this.toListItem(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(id: string, includeEvents = true): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.includeAll(),
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.toDto(invoice, includeEvents);
  }

  async create(body: CreateInvoiceRequest, actor: RequestUser): Promise<InvoiceDto> {
    this.validateCustomer(body);
    const items = this.cleanItems(body.items);
    const cfg = await this.getInvoiceConfig();
    const totals = computeInvoiceTotals({
      items,
      discountType: body.discountType,
      discountValue: body.discountValue,
      deliveryCharge: body.deliveryCharge,
      packingCharge: body.packingCharge,
      otherCharges: body.otherCharges,
      taxEnabled: body.taxEnabled ?? cfg.taxEnabled,
      taxType: body.taxType ?? cfg.taxType,
      taxRate: body.taxRate ?? cfg.taxRate,
    });
    if (!totals.items.length) throw new BadRequestException('Add at least one invoice item');

    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
    const dueDate = body.dueDate
      ? new Date(body.dueDate)
      : new Date(invoiceDate.getTime() + cfg.dueDays * 86400000);
    const outletKey = (body.outletKey || 'default').trim() || 'default';
    const invoiceNumber = await this.nextInvoiceNumber(
      outletKey,
      invoiceDate.getFullYear(),
      cfg.prefix,
    );

    const created = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        outletKey,
        orderId: body.orderId || null,
        userId: body.userId || null,
        customerType: body.customerType as InvoiceCustomerType,
        customerName: body.customerName.trim(),
        contactPerson: body.contactPerson?.trim() || null,
        phone: body.phone?.trim() || null,
        whatsapp: body.whatsapp?.trim() || body.phone?.trim() || null,
        email: body.email?.trim() || null,
        billingAddress: body.billingAddress?.trim() || null,
        deliveryAddress: body.deliveryAddress?.trim() || null,
        gstin: body.gstin?.trim() || null,
        pan: body.pan?.trim() || null,
        referenceNumber: body.referenceNumber?.trim() || null,
        paymentTerms: body.paymentTerms?.trim() || cfg.defaultPaymentTerms || null,
        notes: body.notes?.trim() || null,
        subtotal: totals.subtotal,
        discountType: (body.discountType as InvoiceDiscountType) || null,
        discountValue: body.discountValue ?? null,
        discountAmount: totals.discountAmount,
        discountLabel: body.discountLabel?.trim() || null,
        applyPromoDiscount: Boolean(body.applyPromoDiscount),
        deliveryCharge: totals.deliveryCharge,
        packingCharge: totals.packingCharge,
        otherCharges: totals.otherCharges,
        otherChargesLabel: body.otherChargesLabel?.trim() || null,
        taxEnabled: totals.taxEnabled,
        taxType: totals.taxType as InvoiceTaxType,
        taxRate: totals.taxRate,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        amountPaid: 0,
        balanceDue: totals.grandTotal,
        status: this.statusFrom(0, totals.grandTotal, dueDate, 'UNPAID'),
        createdById: actor.id,
        updatedById: actor.id,
        items: {
          create: totals.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            notes: item.notes,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
        events: {
          create: {
            action: 'CREATED',
            userId: actor.id,
            userName: actor.name || actor.email || 'Admin',
            detail: `Invoice ${invoiceNumber} created`,
          },
        },
      },
      include: this.includeAll(),
    });

    await this.audit.log({
      userId: actor.id,
      userName: actor.name || undefined,
      action: 'INVOICE_CREATED',
      entity: 'Invoice',
      entityId: created.id,
      description: created.invoiceNumber,
    });

    void this.maybeAutoEmail(created.id, 'CREATED');
    return this.toDto(created);
  }

  async update(
    id: string,
    body: Partial<CreateInvoiceRequest>,
    actor: RequestUser,
  ): Promise<InvoiceDto> {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Invoice not found');
    if (existing.status === 'CANCELLED')
      throw new BadRequestException('Cancelled invoices cannot be edited');

    const mergedItems = body.items
      ? this.cleanItems(body.items)
      : existing.items.map((i) => ({
          productId: i.productId,
          description: i.description,
          notes: i.notes,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        }));
    const cfg = await this.getInvoiceConfig();
    const totals = computeInvoiceTotals({
      items: mergedItems,
      discountType: body.discountType !== undefined ? body.discountType : existing.discountType,
      discountValue:
        body.discountValue !== undefined ? body.discountValue : Number(existing.discountValue ?? 0),
      deliveryCharge:
        body.deliveryCharge !== undefined ? body.deliveryCharge : Number(existing.deliveryCharge),
      packingCharge:
        body.packingCharge !== undefined ? body.packingCharge : Number(existing.packingCharge),
      otherCharges:
        body.otherCharges !== undefined ? body.otherCharges : Number(existing.otherCharges),
      taxEnabled: body.taxEnabled !== undefined ? body.taxEnabled : existing.taxEnabled,
      taxType: body.taxType !== undefined ? body.taxType : existing.taxType,
      taxRate: body.taxRate !== undefined ? body.taxRate : Number(existing.taxRate),
    });
    if (!totals.items.length) throw new BadRequestException('Add at least one invoice item');

    const amountPaid = Number(existing.amountPaid);
    const dueDate = body.dueDate ? new Date(body.dueDate) : existing.dueDate;
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : existing.invoiceDate;

    await this.prisma.$transaction([
      this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      this.prisma.invoice.update({
        where: { id },
        data: {
          invoiceDate,
          dueDate,
          orderId: body.orderId !== undefined ? body.orderId || null : undefined,
          userId: body.userId !== undefined ? body.userId || null : undefined,
          customerType: body.customerType ? (body.customerType as InvoiceCustomerType) : undefined,
          customerName: body.customerName?.trim() || existing.customerName,
          contactPerson:
            body.contactPerson !== undefined ? body.contactPerson?.trim() || null : undefined,
          phone: body.phone !== undefined ? body.phone?.trim() || null : undefined,
          whatsapp: body.whatsapp !== undefined ? body.whatsapp?.trim() || null : undefined,
          email: body.email !== undefined ? body.email?.trim() || null : undefined,
          billingAddress:
            body.billingAddress !== undefined ? body.billingAddress?.trim() || null : undefined,
          deliveryAddress:
            body.deliveryAddress !== undefined ? body.deliveryAddress?.trim() || null : undefined,
          gstin: body.gstin !== undefined ? body.gstin?.trim() || null : undefined,
          pan: body.pan !== undefined ? body.pan?.trim() || null : undefined,
          referenceNumber:
            body.referenceNumber !== undefined ? body.referenceNumber?.trim() || null : undefined,
          paymentTerms:
            body.paymentTerms !== undefined
              ? body.paymentTerms?.trim() || cfg.defaultPaymentTerms
              : undefined,
          notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
          subtotal: totals.subtotal,
          discountType:
            body.discountType !== undefined
              ? (body.discountType as InvoiceDiscountType) || null
              : undefined,
          discountValue: body.discountValue !== undefined ? body.discountValue : undefined,
          discountAmount: totals.discountAmount,
          discountLabel:
            body.discountLabel !== undefined ? body.discountLabel?.trim() || null : undefined,
          applyPromoDiscount:
            body.applyPromoDiscount !== undefined ? Boolean(body.applyPromoDiscount) : undefined,
          deliveryCharge: totals.deliveryCharge,
          packingCharge: totals.packingCharge,
          otherCharges: totals.otherCharges,
          otherChargesLabel:
            body.otherChargesLabel !== undefined
              ? body.otherChargesLabel?.trim() || null
              : undefined,
          taxEnabled: totals.taxEnabled,
          taxType: totals.taxType as InvoiceTaxType,
          taxRate: totals.taxRate,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
          balanceDue: money(Math.max(0, totals.grandTotal - amountPaid)),
          status: this.statusFrom(amountPaid, totals.grandTotal, dueDate, existing.status),
          updatedById: actor.id,
          items: {
            create: totals.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              notes: item.notes,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              sortOrder: item.sortOrder,
            })),
          },
          events: {
            create: {
              action: 'UPDATED',
              userId: actor.id,
              userName: actor.name || actor.email || 'Admin',
              detail: 'Invoice details updated',
            },
          },
        },
      }),
    ]);

    void this.maybeAutoEmail(id, 'UPDATED');
    return this.getById(id);
  }

  async cancel(id: string, actor: RequestUser, reason?: string): Promise<InvoiceDto> {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Invoice not found');
    if (existing.status === 'CANCELLED')
      throw new BadRequestException('Invoice is already cancelled');
    await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: actor.id,
        cancelReason: reason?.trim() || null,
        updatedById: actor.id,
        events: {
          create: {
            action: 'CANCELLED',
            userId: actor.id,
            userName: actor.name || actor.email || 'Admin',
            detail: reason?.trim() || 'Invoice cancelled',
          },
        },
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'INVOICE_CANCELLED',
      entity: 'Invoice',
      entityId: id,
      description: existing.invoiceNumber,
    });
    void this.maybeAutoEmail(id, 'CANCELLED');
    return this.getById(id);
  }

  async recordPayment(
    id: string,
    body: RecordInvoicePaymentRequest,
    actor: RequestUser,
  ): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'CANCELLED')
      throw new BadRequestException('Cannot record payment on a cancelled invoice');
    if (!PAY_METHODS.has(body.method)) throw new BadRequestException('Invalid payment method');
    const amount = money(body.amount);
    if (amount <= 0) throw new BadRequestException('Payment amount must be greater than zero');
    const currentPaid = Number(invoice.amountPaid);
    const grand = Number(invoice.grandTotal);
    if (currentPaid + amount > grand + 0.009) {
      throw new BadRequestException('Payment exceeds invoice balance');
    }
    const amountPaid = money(currentPaid + amount);
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();

    await this.prisma.invoicePayment.create({
      data: {
        invoiceId: id,
        amount,
        paidAt,
        method: body.method,
        reference: body.reference?.trim() || null,
        notes: body.notes?.trim() || null,
        recordedById: actor.id,
      },
    });
    await this.prisma.invoice.update({
      where: { id },
      data: {
        amountPaid,
        balanceDue: money(Math.max(0, grand - amountPaid)),
        status: this.statusFrom(amountPaid, grand, invoice.dueDate, invoice.status),
        updatedById: actor.id,
        events: {
          create: {
            action: 'PAYMENT',
            userId: actor.id,
            userName: actor.name || actor.email || 'Admin',
            detail: `Payment of ₹${amount.toFixed(2)} via ${body.method}`,
          },
        },
      },
    });
    const nextStatus = this.statusFrom(amountPaid, grand, invoice.dueDate, invoice.status);
    void this.maybeAutoEmail(id, nextStatus === 'PAID' ? 'PAYMENT_RECEIVED' : 'PAYMENT_PENDING');
    return this.getById(id);
  }

  async generatePdf(
    id: string,
    actor?: RequestUser,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.includeAll(),
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const buffer = await this.buildPdf(invoice);
    if (actor) {
      try {
        await this.prisma.invoiceEvent.create({
          data: {
            invoiceId: id,
            action: 'PDF_GENERATED',
            userId: actor.id,
            userName: actor.name || actor.email || 'Admin',
            detail: 'PDF generated',
          },
        });
      } catch {
        /* download should still succeed */
      }
    }
    return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
  }

  async sendEmail(id: string, actor: RequestUser, to?: string, kind: InvoiceEmailKind = 'SENT') {
    const result = await this.deliverInvoiceEmail(id, kind, to);
    await this.prisma.invoiceEvent.create({
      data: {
        invoiceId: id,
        action: 'EMAIL_SENT',
        userId: actor.id,
        userName: actor.name || actor.email || 'Admin',
        detail: result.sent
          ? `Email (${kind.toLowerCase()}) sent to ${result.to}`
          : result.error || 'Email failed',
      },
    });
    if (!result.sent) {
      throw new BadRequestException(result.error || 'Email could not be sent');
    }
    return { sent: true, to: result.to };
  }

  private async maybeAutoEmail(id: string, kind: InvoiceEmailKind) {
    try {
      const cfg = await this.getInvoiceConfig();
      if (!cfg.email.autoSend) return;
      const result = await this.deliverInvoiceEmail(id, kind);
      if (result.sent) {
        await this.prisma.invoiceEvent.create({
          data: {
            invoiceId: id,
            action: 'EMAIL_SENT',
            detail: `Automatic ${kind.toLowerCase()} email sent to ${result.to}`,
          },
        });
      }
    } catch {
      /* invoice save must succeed even if email fails */
    }
  }

  private async deliverInvoiceEmail(
    id: string,
    kind: InvoiceEmailKind,
    to?: string,
  ): Promise<{ sent: boolean; to?: string; error?: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.includeAll(),
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const recipient = (to || invoice.email || '').trim();
    if (!recipient) {
      return { sent: false, error: 'Customer email is required' };
    }
    if (!this.email.isConfigured()) {
      return {
        sent: false,
        error: 'Email is not configured. Add provider credentials on the server.',
      };
    }

    const settings = await this.ensureSettings();
    const cfg = parseInvoiceConfig(settings.invoiceConfig);
    if (!cfg.bank.upiId && settings.upiId) cfg.bank.upiId = settings.upiId;
    const websiteUrl = resolveWebsiteUrl(
      cfg.email.website || settings.websiteUrl,
      this.config.get('WEBSITE_URL'),
    );
    const theme = await this.prisma.themeSettings.findFirst({ select: { logoUrl: true } });
    const logoUrl = resolvePublicAssetUrl(
      cfg.email.logoUrl || theme?.logoUrl,
      websiteUrl,
      this.config.get('STORAGE_PUBLIC_URL'),
    );
    const { buffer, filename } = await this.generatePdf(id);
    const downloadUrl = await this.shareUrl(id);
    const lastPayment = invoice.payments.at(-1);
    const { html, text } = renderInvoiceEmail({
      kind,
      customerName: invoice.customerName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paymentMethod: lastPayment?.method ?? null,
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discountAmount),
      tax: Number(invoice.taxAmount),
      deliveryCharge: Number(invoice.deliveryCharge),
      packingCharge: Number(invoice.packingCharge),
      otherCharges: Number(invoice.otherCharges),
      otherChargesLabel: invoice.otherChargesLabel,
      grandTotal: Number(invoice.grandTotal),
      amountPaid: Number(invoice.amountPaid),
      balanceDue: Number(invoice.balanceDue),
      summaryRows: [
        { label: 'Food / Services', amount: Number(invoice.subtotal) },
        {
          label: invoice.discountLabel || 'Discount',
          amount: Number(invoice.discountAmount),
          muted: true,
        },
        { label: 'Delivery charges', amount: Number(invoice.deliveryCharge) },
        { label: 'Packing charges', amount: Number(invoice.packingCharge) },
        {
          label: invoice.otherChargesLabel || 'Other charges',
          amount: Number(invoice.otherCharges),
        },
        {
          label: invoice.taxEnabled ? `Tax (${invoice.taxType.replace(/_/g, ' ')})` : 'Tax',
          amount: Number(invoice.taxAmount),
        },
        { label: 'Total', amount: Number(invoice.grandTotal), emphasize: true },
        { label: 'Amount paid', amount: Number(invoice.amountPaid) },
        {
          label: 'Balance due',
          amount: Number(invoice.balanceDue),
          emphasize: Number(invoice.balanceDue) > 0,
        },
      ],
      bankName: cfg.bank.bankName,
      accountName: cfg.bank.accountName,
      accountNumber: cfg.bank.accountNumber,
      ifsc: cfg.bank.ifsc,
      upiId: cfg.bank.upiId,
      showBank: cfg.showBankDetails && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID',
      phone: cfg.email.phone || settings.phone,
      email: cfg.email.replyTo || settings.email,
      website: websiteUrl,
      address: cfg.email.address || settings.address,
      logoUrl,
      downloadUrl,
      fileName: filename,
      fileSizeLabel: formatPdfFileSize(buffer.length),
      footerNote: cfg.email.footer,
      tagline: settings.tagline,
    });

    const subject = renderInvoiceEmailSubject(kind, invoice.invoiceNumber, {
      subject: cfg.email.subject,
      overdueSubject: cfg.email.overdueSubject,
    });
    const fromEmail = cfg.email.senderEmail;
    const from =
      fromEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)
        ? formatFromHeader(cfg.email.senderName || 'Mercy Dosa House', fromEmail)
        : undefined;
    const replyTo =
      cfg.email.replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.email.replyTo)
        ? cfg.email.replyTo
        : undefined;

    const result = await this.email.send({
      to: recipient,
      subject,
      text,
      html,
      from,
      replyTo,
      attachments: [{ filename, content: buffer, contentType: 'application/pdf' }],
    });
    return { sent: result.sent, to: recipient, error: result.error };
  }

  async sendWhatsApp(id: string, actor: RequestUser, number?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const raw = (number || invoice.whatsapp || invoice.phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    const e164 = digits.length === 10 ? `91${digits}` : digits;
    if (e164.length < 10) throw new BadRequestException('A valid WhatsApp number is required');

    const shareUrl = await this.shareUrl(id);
    const total = Number(invoice.grandTotal).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const message = `Hello ${invoice.customerName},

Thank you for choosing Mercy Dosa House.

Please find your invoice ${invoice.invoiceNumber} for ₹${total}.
${shareUrl}

Thank you for your order. ❤️

Mercy Dosa House`;

    const apiToken =
      this.config.get<string>('WHATSAPP_TOKEN') || this.config.get<string>('WHATSAPP_API_TOKEN');
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_ID');
    let delivered = false;
    let error: string | undefined;
    if (apiToken && phoneId) {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: e164,
            type: 'document',
            document: {
              link: shareUrl,
              filename: `${invoice.invoiceNumber}.pdf`,
              caption: message,
            },
          }),
        });
        delivered = res.ok;
        if (!res.ok) error = `WhatsApp API HTTP ${res.status}`;
      } catch (err) {
        error = err instanceof Error ? err.message : 'WhatsApp send failed';
      }
    }

    const fallbackUrl = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
    await this.prisma.invoiceEvent.create({
      data: {
        invoiceId: id,
        action: 'WHATSAPP_SENT',
        userId: actor.id,
        userName: actor.name || actor.email || 'Admin',
        detail: delivered ? `WhatsApp sent to ${e164}` : `WhatsApp fallback for ${e164}`,
      },
    });
    return {
      sent: delivered,
      fallbackUrl: delivered ? undefined : fallbackUrl,
      shareUrl,
      error: delivered
        ? undefined
        : error || 'WhatsApp API is not configured. Open WhatsApp to send manually.',
    };
  }

  async shareUrl(id: string): Promise<string> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const token = this.jwt.sign({ typ: 'invoice-pdf', invoiceId: id }, { expiresIn: '7d' });
    const base = await this.publicApiBase();
    return `${base}/invoices/share/${encodeURIComponent(token)}/pdf`;
  }

  async pdfFromShareToken(token: string): Promise<{ buffer: Buffer; filename: string }> {
    let payload: { typ?: string; invoiceId?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new ForbiddenException('Invoice link is invalid or expired');
    }
    if (payload.typ !== 'invoice-pdf' || !payload.invoiceId) {
      throw new ForbiddenException('Invoice link is invalid');
    }
    return this.generatePdf(payload.invoiceId);
  }

  async mine(userId: string): Promise<InvoiceListItemDto[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        status: { not: 'CANCELLED' },
        OR: [{ userId }, { order: { userId } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toListItem(row));
  }

  async getMine(userId: string, id: string): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.includeAll(),
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const owned = invoice.userId === userId || invoice.order?.userId === userId;
    if (!owned) throw new ForbiddenException('You cannot access this invoice');
    return this.toDto(invoice, false);
  }

  async pdfMine(userId: string, id: string) {
    await this.getMine(userId, id);
    return this.generatePdf(id);
  }

  async shareMine(userId: string, id: string) {
    await this.getMine(userId, id);
    return { url: await this.shareUrl(id) };
  }

  private async nextInvoiceNumber(
    outletKey: string,
    year: number,
    prefix: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await this.prisma.$queryRaw<Array<{ lastNumber: number }>>`
        INSERT INTO invoice_sequences (id, "outletKey", year, "lastNumber")
        VALUES (${randomUUID()}, ${outletKey}, ${year}, 1)
        ON CONFLICT ("outletKey", year)
        DO UPDATE SET "lastNumber" = invoice_sequences."lastNumber" + 1
        RETURNING "lastNumber"
      `;
      const seq = rows[0]?.lastNumber ?? 1;
      const number = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
      const exists = await this.prisma.invoice.findUnique({ where: { invoiceNumber: number } });
      if (!exists) return number;
    }
    throw new BadRequestException('Could not allocate a unique invoice number. Please retry.');
  }

  private async markOverdue() {
    const now = new Date();
    const due = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      },
      select: { id: true },
    });
    if (!due.length) return;
    await this.prisma.invoice.updateMany({
      where: { id: { in: due.map((d) => d.id) } },
      data: { status: 'OVERDUE' },
    });
    for (const row of due) {
      void this.maybeAutoEmail(row.id, 'PAYMENT_OVERDUE');
    }
  }

  private async buildPdf(invoice: InvoiceRow): Promise<Buffer> {
    const settings = await this.ensureSettings();
    const cfg = parseInvoiceConfig(settings.invoiceConfig);
    if (!cfg.bank.upiId && settings.upiId) cfg.bank.upiId = settings.upiId;
    const theme = await this.prisma.themeSettings.findFirst({ select: { logoUrl: true } });
    const websiteUrl = resolveWebsiteUrl(settings.websiteUrl, this.config.get('WEBSITE_URL'));
    const logoUrl = resolvePublicAssetUrl(
      theme?.logoUrl,
      websiteUrl,
      this.config.get('STORAGE_PUBLIC_URL'),
    );
    const logo = await fetchBuffer(logoUrl);
    try {
      return await this.pdf.render({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        customerType: invoice.customerType,
        customerName: invoice.customerName,
        contactPerson: invoice.contactPerson,
        phone: invoice.phone,
        email: invoice.email,
        billingAddress: invoice.billingAddress,
        deliveryAddress: invoice.deliveryAddress,
        gstin: invoice.gstin,
        pan: invoice.pan,
        referenceNumber: invoice.referenceNumber,
        paymentTerms: invoice.paymentTerms,
        notes: invoice.notes,
        items: invoice.items
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({
            description: item.description,
            notes: item.notes,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
          })),
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        discountLabel: invoice.discountLabel,
        deliveryCharge: Number(invoice.deliveryCharge),
        packingCharge: Number(invoice.packingCharge),
        otherCharges: Number(invoice.otherCharges),
        otherChargesLabel: invoice.otherChargesLabel,
        taxEnabled: invoice.taxEnabled,
        taxType: invoice.taxType,
        taxRate: Number(invoice.taxRate),
        cgstAmount: Number(invoice.cgstAmount),
        sgstAmount: Number(invoice.sgstAmount),
        igstAmount: Number(invoice.igstAmount),
        taxAmount: Number(invoice.taxAmount),
        grandTotal: Number(invoice.grandTotal),
        amountPaid: Number(invoice.amountPaid),
        balanceDue: Number(invoice.balanceDue),
        status: invoice.status,
        payments: invoice.payments.map((p) => ({
          method: p.method,
          amount: Number(p.amount),
          paidAt: p.paidAt,
          reference: p.reference,
        })),
        business: {
          name: settings.businessName,
          tagline: settings.tagline,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.websiteUrl,
          gstin: settings.gstNumber,
          fssai: settings.fssaiEnabled ? settings.fssaiRegistrationNumber : null,
          pan: cfg.pan || null,
        },
        config: cfg,
        logo,
      });
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error
          ? `Could not generate invoice PDF: ${err.message}`
          : 'Could not generate invoice PDF',
      );
    }
  }

  private async publicApiBase(): Promise<string> {
    const explicit = this.config.get<string>('PUBLIC_API_URL')?.replace(/\/$/, '');
    if (explicit) return explicit;
    const settings = await this.prisma.businessSettings.findFirst({ select: { websiteUrl: true } });
    const site = resolveWebsiteUrl(settings?.websiteUrl, this.config.get('WEBSITE_URL'));
    return `${site}/api/v1`;
  }

  private async ensureSettings() {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSettings.create({
        data: { invoiceConfig: DEFAULT_INVOICE_CONFIG as unknown as Prisma.InputJsonValue },
      });
    }
    return settings;
  }

  private includeAll() {
    return {
      items: { orderBy: { sortOrder: 'asc' as const } },
      payments: {
        orderBy: { paidAt: 'asc' as const },
        include: { recordedBy: { select: { name: true } } },
      },
      events: { orderBy: { createdAt: 'asc' as const } },
      createdBy: { select: { name: true } },
      order: { select: { orderNumber: true, userId: true } },
    };
  }

  private async toDto(invoice: InvoiceRow, includeEvents = true): Promise<InvoiceDto> {
    const previous = await this.prisma.invoice.findMany({
      where: {
        id: { not: invoice.id },
        customerName: { equals: invoice.customerName, mode: 'insensitive' },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 20,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        grandTotal: true,
        status: true,
      },
    });
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      outletKey: invoice.outletKey,
      orderId: invoice.orderId,
      orderNumber: invoice.order?.orderNumber ?? null,
      userId: invoice.userId,
      customerType: invoice.customerType,
      customerName: invoice.customerName,
      contactPerson: invoice.contactPerson,
      phone: invoice.phone,
      whatsapp: invoice.whatsapp,
      email: invoice.email,
      billingAddress: invoice.billingAddress,
      deliveryAddress: invoice.deliveryAddress,
      gstin: invoice.gstin,
      pan: invoice.pan,
      referenceNumber: invoice.referenceNumber,
      paymentTerms: invoice.paymentTerms,
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        description: item.description,
        notes: item.notes,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        sortOrder: item.sortOrder,
      })),
      subtotal: Number(invoice.subtotal),
      discountType: invoice.discountType,
      discountValue: invoice.discountValue != null ? Number(invoice.discountValue) : null,
      discountAmount: Number(invoice.discountAmount),
      discountLabel: invoice.discountLabel,
      applyPromoDiscount: invoice.applyPromoDiscount,
      deliveryCharge: Number(invoice.deliveryCharge),
      packingCharge: Number(invoice.packingCharge),
      otherCharges: Number(invoice.otherCharges),
      otherChargesLabel: invoice.otherChargesLabel,
      taxEnabled: invoice.taxEnabled,
      taxType: invoice.taxType,
      taxRate: Number(invoice.taxRate),
      cgstAmount: Number(invoice.cgstAmount),
      sgstAmount: Number(invoice.sgstAmount),
      igstAmount: Number(invoice.igstAmount),
      taxAmount: Number(invoice.taxAmount),
      grandTotal: Number(invoice.grandTotal),
      amountPaid: Number(invoice.amountPaid),
      balanceDue: Number(invoice.balanceDue),
      amountInWords: amountInWordsInr(Number(invoice.grandTotal)),
      status: invoice.status,
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paidAt: p.paidAt.toISOString(),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        recordedByName: p.recordedBy?.name ?? null,
      })),
      events: includeEvents
        ? invoice.events.map((e) => ({
            id: e.id,
            action: e.action,
            userName: e.userName,
            detail: e.detail,
            createdAt: e.createdAt.toISOString(),
          }))
        : undefined,
      previousInvoices: previous.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        invoiceDate: p.invoiceDate.toISOString(),
        grandTotal: Number(p.grandTotal),
        status: p.status,
      })),
      createdByName: invoice.createdBy?.name ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      cancelledAt: invoice.cancelledAt?.toISOString() ?? null,
    };
  }

  private toListItem(row: {
    id: string;
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    customerName: string;
    customerType: InvoiceCustomerType;
    phone: string | null;
    email: string | null;
    grandTotal: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    balanceDue: Prisma.Decimal;
    status: InvoiceStatus;
  }): InvoiceListItemDto {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate.toISOString(),
      dueDate: row.dueDate.toISOString(),
      customerName: row.customerName,
      customerType: row.customerType,
      phone: row.phone,
      email: row.email,
      grandTotal: Number(row.grandTotal),
      amountPaid: Number(row.amountPaid),
      balanceDue: Number(row.balanceDue),
      status: row.status,
    };
  }

  private validateCustomer(body: CreateInvoiceRequest) {
    if (!body.customerName?.trim())
      throw new BadRequestException('Customer / organisation name is required');
    if (!CUSTOMER_TYPES.has(body.customerType as InvoiceCustomerType)) {
      throw new BadRequestException('Invalid customer type');
    }
    if (body.taxType && !TAX_TYPES.has(body.taxType as InvoiceTaxType)) {
      throw new BadRequestException('Invalid tax type');
    }
  }

  private cleanItems(items: CreateInvoiceRequest['items']) {
    return (items || []).map((item) => ({
      productId: item.productId || null,
      description: String(item.description || '').trim(),
      notes: item.notes?.trim() || null,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));
  }

  private statusFrom(
    amountPaid: number,
    grandTotal: number,
    dueDate: Date,
    current: InvoiceStatus,
  ): InvoiceStatus {
    if (current === 'CANCELLED') return 'CANCELLED';
    if (amountPaid >= grandTotal - 0.009) return 'PAID';
    if (amountPaid > 0) return 'PARTIALLY_PAID';
    if (dueDate.getTime() < Date.now()) return 'OVERDUE';
    return 'UNPAID';
  }
}

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('image') && !type.includes('octet-stream')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
