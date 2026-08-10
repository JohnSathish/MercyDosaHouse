import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderType,
  OrderSource,
  PaymentMethod,
  PaymentStatus,
  PosBillStatus,
  PosTableStatus,
  PosSessionStatus,
  PosDiscountType,
  Prisma,
  TrackingStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { AuditService } from '../audit/audit.service';
import { PosGateway } from './pos.gateway';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';

const billInclude = {
  items: true,
  posTable: true,
  posPaymentLines: true,
  posDiscounts: true,
  cashier: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

type BillWithRelations = Prisma.OrderGetPayload<{ include: typeof billInclude }>;

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
    private posGateway: PosGateway,
    private audit: AuditService,
    private orderEmailNotification: OrderEmailNotificationService,
  ) {}

  private toNum(v: Prisma.Decimal | number | null | undefined) {
    return v == null ? 0 : Number(v);
  }

  private async generateOrderNumber() {
    const settings = await this.prisma.businessSettings.findFirst();
    const now = new Date();
    const dateKey = parseInt(
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
      10,
    );
    const isSameDay = settings!.orderYear === dateKey;
    const updated = await this.prisma.businessSettings.update({
      where: { id: settings!.id },
      data: {
        orderSequence: isSameDay ? { increment: 1 } : 1,
        orderYear: dateKey,
      },
    });
    return `MDH-${dateKey}-${String(updated.orderSequence).padStart(6, '0')}`;
  }

  private async getOrCreateSession(cashierId: string, terminalId?: string) {
    if (!cashierId) {
      throw new BadRequestException('Cashier session requires an authenticated user');
    }
    const open = await this.prisma.posSession.findFirst({
      where: { cashierId, status: PosSessionStatus.OPEN },
    });
    if (open) return open;

    const branch = await this.prisma.branch.findFirst({ where: { isDefault: true } });
    return this.prisma.posSession.create({
      data: {
        branchId: branch!.id,
        cashierId,
        terminalId,
        status: PosSessionStatus.OPEN,
      },
    });
  }

  private mapBill(order: BillWithRelations) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      billStatus: order.billStatus,
      status: order.status,
      tableId: order.posTableId,
      tableLabel: order.posTable?.label ?? null,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerId: order.userId,
      deliveryAddress: order.deliveryAddress,
      covers: order.covers,
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPrice: this.toNum(i.unitPrice),
        totalPrice: this.toNum(i.totalPrice),
        unitPackingCharge: this.toNum(i.unitPackingCharge),
        packingCharge: this.toNum(i.packingCharge),
        specialInstructions: i.specialInstructions,
      })),
      subtotal: this.toNum(order.subtotal),
      deliveryCharge: this.toNum(order.deliveryCharge),
      packingCharge: this.toNum(order.packingCharge),
      packedItemCount: order.packedItemCount,
      taxAmount: this.toNum(order.taxAmount),
      cgstAmount: this.toNum(order.cgstAmount),
      sgstAmount: this.toNum(order.sgstAmount),
      discount: this.toNum(order.discount),
      grandTotal: this.toNum(order.grandTotal),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      tokenNumber: order.tokenNumber,
      paymentLines: order.posPaymentLines?.map((l) => ({
        method: l.method,
        amount: this.toNum(l.amount),
        reference: l.reference ?? undefined,
      })),
      amountReceived: order.posPaymentLines?.length
        ? order.posPaymentLines.reduce((s, l) => s + this.toNum(l.amount), 0)
        : undefined,
      changeDue: order.posPaymentLines?.length
        ? Math.max(
            0,
            order.posPaymentLines.reduce((s, l) => s + this.toNum(l.amount), 0) -
              this.toNum(order.grandTotal),
          )
        : undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private modeConfig(orderType: OrderType) {
    const configs: Record<
      OrderType,
      { delivery: boolean; packing: boolean; table: boolean; min: number }
    > = {
      DINE_IN: { delivery: false, packing: false, table: true, min: 0 },
      TAKEAWAY: { delivery: false, packing: true, table: false, min: 0 },
      DELIVERY: { delivery: true, packing: true, table: false, min: 100 },
      ONLINE_PICKUP: { delivery: false, packing: true, table: false, min: 0 },
      STAFF_MEAL: { delivery: false, packing: false, table: false, min: 0 },
    };
    return configs[orderType];
  }

  private async recalculateBill(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Bill not found');

    const mode = this.modeConfig(order.orderType);
    const settings = await this.prisma.businessSettings.findFirst();
    const deliveryCharge = mode.delivery ? Number(settings?.deliveryCharge ?? 30) : 0;

    let subtotal = 0;
    let packingCharge = 0;
    let packedItemCount = 0;
    let taxAmount = 0;

    for (const item of order.items) {
      const lineSub = this.toNum(item.unitPrice) * item.quantity;
      subtotal += lineSub;
      const unitPack = mode.packing ? this.toNum(item.unitPackingCharge) : 0;
      const linePack = unitPack * item.quantity;
      packingCharge += linePack;
      packedItemCount += item.quantity;
      const gst = item.product?.category?.gstPercent ? Number(item.product.category.gstPercent) : 0;
      if (gst > 0) taxAmount += Math.round((lineSub * gst) / 100);
    }

    const half = Math.round(taxAmount / 2);
    const discount = this.toNum(order.discount);
    const grandTotal = Math.max(
      0,
      subtotal + deliveryCharge + packingCharge + taxAmount - discount,
    );

    if (mode.min > 0 && subtotal < mode.min) {
      // Minimum order validated at settlement, not while building the bill.
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        deliveryCharge,
        packingCharge,
        packedItemCount,
        taxAmount,
        cgstAmount: half,
        sgstAmount: taxAmount - half,
        grandTotal,
      },
      include: billInclude,
    });
  }

  async getMenu(search?: string) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, showOnPos: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: {
            isAvailable: true,
            ...(search
              ? {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { slug: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                    { ingredients: { contains: search, mode: 'insensitive' as const } },
                    { category: { name: { contains: search, mode: 'insensitive' as const } } },
                  ],
                }
              : {}),
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        sortOrder: c.sortOrder,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          packingCharge: Number(p.packingCharge ?? 20),
          imageUrl: p.imageUrl,
          categoryId: c.id,
          categoryName: c.name,
          foodType: p.foodType,
          prepTimeMinutes: p.prepTimeMinutes,
          isAvailable: p.isAvailable,
          isPopular: p.isPopular,
          gstPercent: c.gstPercent ? Number(c.gstPercent) : null,
        })),
      })),
    };
  }

  async getFloors() {
    return this.prisma.posFloor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          orderBy: { label: 'asc' },
          include: {
            orders: {
              where: { billStatus: { in: [PosBillStatus.OPEN, PosBillStatus.HELD] } },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });
  }

  async getTables(floorId?: string) {
    const tables = await this.prisma.posTable.findMany({
      where: floorId ? { floorId } : {},
      orderBy: { label: 'asc' },
      include: {
        orders: {
          where: { billStatus: { in: [PosBillStatus.OPEN, PosBillStatus.HELD] } },
          take: 1,
          select: { id: true },
        },
      },
    });
    return tables.map((t) => ({
      id: t.id,
      floorId: t.floorId,
      label: t.label,
      capacity: t.capacity,
      status: t.status,
      posX: t.posX,
      posY: t.posY,
      mergedIntoId: t.mergedIntoId,
      activeOrderId: t.orders[0]?.id ?? null,
    }));
  }

  async updateTableStatus(tableId: string, status: PosTableStatus) {
    const table = await this.prisma.posTable.update({
      where: { id: tableId },
      data: { status },
    });
    this.posGateway.emitTableUpdate(tableId, { status });
    return table;
  }

  async mergeTables(tableIds: string[], targetTableId: string) {
    await this.prisma.posTable.updateMany({
      where: { id: { in: tableIds.filter((id) => id !== targetTableId) } },
      data: { mergedIntoId: targetTableId, status: PosTableStatus.OCCUPIED },
    });
    await this.updateTableStatus(targetTableId, PosTableStatus.OCCUPIED);
    return this.getTables();
  }

  async transferTable(fromTableId: string, toTableId: string) {
    await this.prisma.order.updateMany({
      where: { posTableId: fromTableId, billStatus: PosBillStatus.OPEN },
      data: { posTableId: toTableId },
    });
    await this.updateTableStatus(fromTableId, PosTableStatus.AVAILABLE);
    await this.updateTableStatus(toTableId, PosTableStatus.OCCUPIED);
    return this.getTables();
  }

  async createBill(
    data: {
      orderType: OrderType;
      tableId?: string;
      customerName?: string;
      customerPhone?: string;
      customerId?: string;
      deliveryAddress?: string;
      covers?: number;
    },
    cashierId: string,
  ) {
    const mode = this.modeConfig(data.orderType);
    if (mode.table && !data.tableId) {
      throw new BadRequestException('Table is required for dine-in orders');
    }

    const session = await this.getOrCreateSession(cashierId);
    const branch = await this.prisma.branch.findFirst({ where: { isDefault: true } });
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        orderType: data.orderType,
        orderSource: OrderSource.POS,
        billStatus: PosBillStatus.OPEN,
        status: OrderStatus.PENDING,
        branchId: branch?.id,
        posSessionId: session.id,
        cashierId,
        posTableId: data.tableId,
        userId: data.customerId,
        customerName: data.customerName ?? 'Walk-in Customer',
        customerPhone: data.customerPhone ?? '0000000000',
        deliveryAddress: data.deliveryAddress ?? null,
        covers: data.covers,
        subtotal: 0,
        deliveryCharge: 0,
        packingCharge: 0,
        taxAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        discount: 0,
        grandTotal: 0,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      },
      include: billInclude,
    });

    if (data.tableId) {
      await this.updateTableStatus(data.tableId, PosTableStatus.OCCUPIED);
    }

    return this.mapBill(order);
  }

  async getBill(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: billInclude,
    });
    if (!order) throw new NotFoundException('Bill not found');
    return this.mapBill(order);
  }

  async updateBillDetails(
    id: string,
    data: {
      customerName?: string;
      customerPhone?: string;
      customerId?: string | null;
      covers?: number;
      orderType?: OrderType;
      deliveryAddress?: string | null;
      tableId?: string | null;
    },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Bill not found');
    if (order.billStatus !== PosBillStatus.OPEN) {
      throw new BadRequestException('Bill is not open');
    }

    const nextType = data.orderType ?? order.orderType;
    const mode = this.modeConfig(nextType);

    if (data.orderType && data.orderType !== order.orderType) {
      if (mode.table && !data.tableId && !order.posTableId) {
        throw new BadRequestException('Table is required for dine-in orders');
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(data.customerName !== undefined ? { customerName: data.customerName } : {}),
        ...(data.customerPhone !== undefined ? { customerPhone: data.customerPhone } : {}),
        ...(data.customerId !== undefined ? { userId: data.customerId } : {}),
        ...(data.covers !== undefined ? { covers: data.covers } : {}),
        ...(data.orderType !== undefined ? { orderType: data.orderType } : {}),
        ...(data.deliveryAddress !== undefined ? { deliveryAddress: data.deliveryAddress } : {}),
        ...(data.tableId !== undefined ? { posTableId: data.tableId } : {}),
        ...(data.orderType && !mode.table ? { posTableId: null } : {}),
      },
      include: billInclude,
    });

    if (order.posTableId && data.orderType && !mode.table) {
      await this.updateTableStatus(order.posTableId, PosTableStatus.AVAILABLE);
    }
    if (updated.posTableId && mode.table) {
      await this.updateTableStatus(updated.posTableId, PosTableStatus.OCCUPIED);
    }

    const recalculated = await this.recalculateBill(id);
    const mapped = this.mapBill(recalculated);
    this.posGateway.emitBillUpdate(id, mapped);
    return mapped;
  }

  async listBills(params: {
    status?: PosBillStatus;
    sessionId?: string;
    limit?: number;
    search?: string;
  }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const orders = await this.prisma.order.findMany({
      where: {
        orderSource: OrderSource.POS,
        ...(params.status ? { billStatus: params.status } : {}),
        ...(params.sessionId ? { posSessionId: params.sessionId } : {}),
        ...(params.search
          ? {
              OR: [
                { orderNumber: { contains: params.search, mode: 'insensitive' } },
                { customerName: { contains: params.search, mode: 'insensitive' } },
                { customerPhone: { contains: params.search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: { select: { id: true } }, posTable: { select: { label: true } } },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      billStatus: o.billStatus,
      orderType: o.orderType,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      tableLabel: o.posTable?.label ?? null,
      itemCount: o.items.length,
      grandTotal: this.toNum(o.grandTotal),
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  async getCurrentSession(cashierId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: { cashierId, status: PosSessionStatus.OPEN },
      include: { cashier: { select: { name: true } } },
    });
    if (!session) return null;
    return {
      id: session.id,
      branchId: session.branchId,
      terminalId: session.terminalId,
      cashierId: session.cashierId,
      cashierName: session.cashier?.name ?? undefined,
      status: session.status as 'OPEN' | 'CLOSED',
      openingFloat: this.toNum(session.openingFloat),
      closingCash: session.closingCash != null ? this.toNum(session.closingCash) : null,
      totalSales: this.toNum(session.totalSales),
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
    };
  }

  async getCustomerAddresses(customerId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId: customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return addresses.map((a) => ({
      id: a.id,
      contactName: a.contactName,
      mobileNumber: a.mobileNumber,
      label: a.label ?? undefined,
      line1: a.line1,
      line2: a.line2 ?? undefined,
      landmark: a.landmark ?? undefined,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      country: a.country ?? undefined,
      deliveryNotes: a.deliveryNotes ?? undefined,
      addressType: a.addressType,
      isDefault: a.isDefault,
    }));
  }

  async addItem(
    billId: string,
    data: {
      productId: string;
      variantId?: string;
      quantity?: number;
      specialInstructions?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: billId } });
    if (!order || order.billStatus !== PosBillStatus.OPEN) {
      throw new BadRequestException('Bill is not open');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { variants: true, category: true },
    });
    if (!product || !product.isAvailable) throw new NotFoundException('Product not available');

    let unitPrice = Number(product.price);
    let variantName: string | null = null;
    if (data.variantId) {
      const variant = product.variants.find((v) => v.id === data.variantId);
      if (!variant) throw new NotFoundException('Variant not found');
      unitPrice = Number(variant.price);
      variantName = variant.name;
    }

    const qty = data.quantity ?? 1;
    const unitPacking = Number(product.packingCharge ?? 20);

    const existing = await this.prisma.orderItem.findFirst({
      where: { orderId: billId, productId: data.productId, variantId: data.variantId ?? null },
    });

    if (existing) {
      await this.prisma.orderItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + qty,
          totalPrice: (existing.quantity + qty) * unitPrice,
          packingCharge: (existing.quantity + qty) * unitPacking,
        },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          orderId: billId,
          productId: data.productId,
          variantId: data.variantId,
          productName: product.name,
          variantName,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
          unitPackingCharge: unitPacking,
          packingCharge: unitPacking * qty,
          specialInstructions: data.specialInstructions,
        },
      });
    }

    const updated = await this.recalculateBill(billId);
    const mapped = this.mapBill(updated);
    this.posGateway.emitBillUpdate(billId, mapped);
    return mapped;
  }

  async updateItem(
    billId: string,
    itemId: string,
    data: { quantity?: number; specialInstructions?: string },
  ) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, orderId: billId } });
    if (!item) throw new NotFoundException('Item not found');

    if (data.quantity !== undefined) {
      if (data.quantity <= 0) {
        await this.prisma.orderItem.delete({ where: { id: itemId } });
      } else {
        await this.prisma.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: data.quantity,
            totalPrice: data.quantity * this.toNum(item.unitPrice),
            packingCharge: data.quantity * this.toNum(item.unitPackingCharge),
            specialInstructions: data.specialInstructions ?? item.specialInstructions,
          },
        });
      }
    } else if (data.specialInstructions !== undefined) {
      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { specialInstructions: data.specialInstructions },
      });
    }

    const updated = await this.recalculateBill(billId);
    const mapped = this.mapBill(updated);
    this.posGateway.emitBillUpdate(billId, mapped);
    return mapped;
  }

  async removeItem(billId: string, itemId: string) {
    await this.prisma.orderItem.deleteMany({ where: { id: itemId, orderId: billId } });
    const updated = await this.recalculateBill(billId);
    const mapped = this.mapBill(updated);
    this.posGateway.emitBillUpdate(billId, mapped);
    return mapped;
  }

  async holdBill(billId: string, label?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: billId },
      include: billInclude,
    });
    if (!order) throw new NotFoundException('Bill not found');
    if (!order.items.length) {
      throw new BadRequestException('Add items before holding a bill');
    }

    let sessionId = order.posSessionId;
    if (!sessionId) {
      if (!order.cashierId) {
        throw new BadRequestException('Bill has no cashier session');
      }
      const session = await this.getOrCreateSession(order.cashierId);
      sessionId = session.id;
      await this.prisma.order.update({
        where: { id: billId },
        data: { posSessionId: sessionId },
      });
    }

    await this.prisma.posHoldBill.create({
      data: {
        sessionId,
        tableId: order.posTableId,
        orderId: billId,
        label: label ?? order.orderNumber,
        payloadJson: this.mapBill(order) as unknown as Prisma.InputJsonValue,
      },
    });

    const updated = await this.prisma.order.update({
      where: { id: billId },
      data: { billStatus: PosBillStatus.HELD },
      include: billInclude,
    });

    if (order.posTableId) {
      await this.updateTableStatus(order.posTableId, PosTableStatus.WAITING);
    }

    return this.mapBill(updated);
  }

  async resumeBill(billId: string) {
    const updated = await this.prisma.order.update({
      where: { id: billId },
      data: { billStatus: PosBillStatus.OPEN },
      include: billInclude,
    });
    if (updated.posTableId) {
      await this.updateTableStatus(updated.posTableId, PosTableStatus.OCCUPIED);
    }
    return this.mapBill(updated);
  }

  async fireKitchen(billId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: billId },
      include: { items: true },
    });
    if (!order || order.billStatus !== PosBillStatus.OPEN) {
      throw new BadRequestException('Bill must be open to send to kitchen');
    }
    if (!order.items.length) {
      throw new BadRequestException('Add items before sending to kitchen');
    }

    const updated = await this.prisma.order.update({
      where: { id: billId },
      data: {
        status: OrderStatus.ACCEPTED,
        trackingStatus: TrackingStatus.ACCEPTED,
      },
      include: billInclude,
    });

    if (updated.posTableId) {
      await this.updateTableStatus(updated.posTableId, PosTableStatus.OCCUPIED);
    }

    await this.audit.log({
      userId,
      action: 'POS_KOT',
      entity: 'Order',
      entityId: billId,
      description: 'Kitchen order ticket fired from POS',
    });

    this.ordersGateway.emitNewOrder({
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
    });

    const mapped = this.mapBill(updated);
    this.posGateway.emitBillUpdate(billId, mapped);
    return mapped;
  }

  async getHoldBills(sessionId?: string) {
    const holds = await this.prisma.posHoldBill.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: { createdAt: 'desc' },
      include: { table: true },
    });

    const heldOrders = await this.prisma.order.findMany({
      where: {
        orderSource: OrderSource.POS,
        billStatus: PosBillStatus.HELD,
        ...(sessionId ? { posSessionId: sessionId } : {}),
      },
      include: { items: { select: { id: true } }, posTable: { select: { label: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const mappedHolds = holds.map((h) => {
      const payload = h.payloadJson as {
        grandTotal?: number;
        items?: unknown[];
        orderNumber?: string;
      };
      return {
        id: h.id,
        label: h.label ?? payload.orderNumber ?? 'Held bill',
        tableId: h.tableId,
        tableLabel: h.table?.label ?? null,
        orderId: h.orderId,
        grandTotal: payload.grandTotal ?? 0,
        itemCount: payload.items?.length ?? 0,
        createdAt: h.createdAt.toISOString(),
      };
    });

    const coveredOrderIds = new Set(
      mappedHolds.map((h) => h.orderId).filter((id): id is string => !!id),
    );

    const orphanHeld = heldOrders
      .filter((o) => !coveredOrderIds.has(o.id))
      .map((o) => ({
        id: `held-order-${o.id}`,
        label: o.orderNumber,
        tableId: o.posTableId,
        tableLabel: o.posTable?.label ?? null,
        orderId: o.id,
        grandTotal: this.toNum(o.grandTotal),
        itemCount: o.items.length,
        createdAt: o.updatedAt.toISOString(),
      }));

    return [...mappedHolds, ...orphanHeld].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async applyDiscount(
    billId: string,
    data: { type: PosDiscountType; amount: number; reason?: string; managerPin?: string },
    userId: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: billId } });
    if (!order) throw new NotFoundException('Bill not found');

    let discountAmount = data.amount;
    if (data.type === PosDiscountType.PERCENTAGE) {
      discountAmount = Math.round((this.toNum(order.subtotal) * data.amount) / 100);
    }

    if (discountAmount > this.toNum(order.subtotal) * 0.1) {
      const approver = await this.verifyManagerPin(data.managerPin);
      if (!approver) throw new ForbiddenException('Manager approval required for discount > 10%');
    }

    await this.prisma.posDiscount.create({
      data: {
        orderId: billId,
        type: data.type,
        amount: discountAmount,
        reason: data.reason,
        approvedById: data.managerPin ? userId : undefined,
      },
    });

    await this.prisma.order.update({
      where: { id: billId },
      data: { discount: discountAmount },
    });

    await this.audit.log({
      userId,
      action: 'POS_DISCOUNT',
      entity: 'Order',
      entityId: billId,
      description: `Applied ${data.type} discount of ₹${discountAmount}`,
      newValue: { type: data.type, amount: discountAmount, reason: data.reason },
    });

    const updated = await this.recalculateBill(billId);
    return this.mapBill(updated);
  }

  private async verifyManagerPin(pin?: string) {
    if (!pin) return null;
    const managers = await this.prisma.user.findMany({
      where: { role: { name: { in: ['SUPER_ADMIN', 'MANAGER'] } } },
      select: { id: true, managerPinHash: true },
    });
    for (const m of managers) {
      if (m.managerPinHash && (await bcrypt.compare(pin, m.managerPinHash))) return m;
    }
    return null;
  }

  async settleBill(
    billId: string,
    data: {
      paymentMethod: PaymentMethod;
      paymentLines?: { method: PaymentMethod; amount: number; reference?: string }[];
    },
    cashierId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: billId },
      include: { items: true },
    });
    if (!order || order.billStatus !== PosBillStatus.OPEN) {
      throw new BadRequestException('Bill is not open for settlement');
    }
    if (!order.items.length) throw new BadRequestException('Bill has no items');

    const mode = this.modeConfig(order.orderType);
    if (mode.table && !order.posTableId) {
      throw new BadRequestException('Table is required for dine-in checkout');
    }
    if (order.orderType === OrderType.DELIVERY) {
      if (!order.deliveryAddress?.trim()) {
        throw new BadRequestException('Delivery address is required');
      }
      if (!order.customerPhone || order.customerPhone === '0000000000') {
        throw new BadRequestException('Customer phone is required for delivery');
      }
    }
    if (order.orderType === OrderType.ONLINE_PICKUP) {
      if (!order.customerPhone || order.customerPhone === '0000000000') {
        throw new BadRequestException('Customer phone is required for pickup');
      }
    }

    const refreshed = await this.recalculateBill(billId);
    const subtotal = this.toNum(refreshed.subtotal);
    if (mode.min > 0 && subtotal < mode.min) {
      throw new BadRequestException(`Minimum order amount is ₹${mode.min}`);
    }
    const grandTotal = this.toNum(refreshed.grandTotal);

    const lines = data.paymentLines?.length
      ? data.paymentLines
      : [{ method: data.paymentMethod, amount: grandTotal }];

    const lineTotal = lines.reduce((s, l) => s + l.amount, 0);
    if (lineTotal < grandTotal) {
      throw new BadRequestException('Payment amount is insufficient');
    }

    const tokenNumber = await this.nextTokenNumber();

    const settled = await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: billId,
          method: data.paymentMethod,
          amount: grandTotal,
          status: PaymentStatus.COMPLETED,
        },
      });

      for (const line of lines) {
        await tx.posPaymentLine.create({
          data: {
            orderId: billId,
            method: line.method,
            amount: line.amount,
            reference: line.reference,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: billId },
        data: {
          billStatus: PosBillStatus.SETTLED,
          status: OrderStatus.ACCEPTED,
          trackingStatus: TrackingStatus.ACCEPTED,
          paymentMethod: data.paymentMethod,
          paymentStatus: PaymentStatus.COMPLETED,
          tokenNumber,
          completedAt: new Date(),
        },
        include: billInclude,
      });

      if (updated.posSessionId) {
        await tx.posSession.update({
          where: { id: updated.posSessionId },
          data: { totalSales: { increment: grandTotal } },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: billId,
          newStatus: OrderStatus.ACCEPTED,
          updatedById: cashierId,
          remarks: 'POS settlement',
        },
      });

      return updated;
    });

    if (settled.posTableId) {
      await this.updateTableStatus(settled.posTableId, PosTableStatus.AVAILABLE);
    }

    this.ordersGateway.emitNewOrder({
      id: settled.id,
      orderNumber: settled.orderNumber,
      status: settled.status,
    });

    const mapped = this.mapBill(settled);
    this.posGateway.emitBillUpdate(billId, { ...mapped, settled: true });
    this.posGateway.emitAnalytics(await this.getLiveAnalytics());

    void this.orderEmailNotification.notifyOrderConfirmed(billId);

    return mapped;
  }

  private async nextTokenNumber() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await this.prisma.order.count({
      where: { createdAt: { gte: todayStart }, orderSource: OrderSource.POS },
    });
    return count + 1;
  }

  async searchCustomers(q: string) {
    const customers = await this.prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: q } },
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
        role: { name: 'CUSTOMER' },
      },
      take: 10,
      include: {
        orders: { select: { grandTotal: true }, take: 100 },
        favorites: { include: { product: { select: { name: true } } }, take: 5 },
      },
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name ?? 'Customer',
      phone: c.phone ?? '',
      email: c.email,
      loyaltyPoints: c.loyaltyPoints,
      loyaltyTier: c.loyaltyTier,
      lifetimeSpend: c.orders.reduce((s, o) => s + Number(o.grandTotal), 0),
      orderCount: c.orders.length,
      favoriteItems: c.favorites.map((f) => f.product.name),
      lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
    }));
  }

  async getLiveAnalytics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        orderSource: OrderSource.POS,
        billStatus: PosBillStatus.SETTLED,
      },
      include: { items: true, posPaymentLines: true },
    });

    const revenueToday = orders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const paymentMap = new Map<string, { amount: number; count: number }>();

    for (const o of orders) {
      if (o.posPaymentLines.length) {
        for (const line of o.posPaymentLines) {
          const key = line.method;
          const cur = paymentMap.get(key) ?? { amount: 0, count: 0 };
          paymentMap.set(key, {
            amount: cur.amount + Number(line.amount),
            count: cur.count + 1,
          });
        }
      } else {
        const key = o.paymentMethod;
        const cur = paymentMap.get(key) ?? { amount: 0, count: 0 };
        paymentMap.set(key, {
          amount: cur.amount + Number(o.grandTotal),
          count: cur.count + 1,
        });
      }
    }

    const itemCounts = new Map<string, { name: string; quantity: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const cur = itemCounts.get(item.productId) ?? { name: item.productName, quantity: 0 };
        itemCounts.set(item.productId, {
          name: item.productName,
          quantity: cur.quantity + item.quantity,
        });
      }
    }

    const busyHours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
    for (const o of orders) {
      busyHours[o.createdAt.getHours()].orders += 1;
    }

    const uniqueCustomers = new Set(orders.map((o) => o.customerPhone)).size;

    return {
      revenueToday,
      ordersToday: orders.length,
      avgBillValue: orders.length ? Math.round(revenueToday / orders.length) : 0,
      customersToday: uniqueCustomers,
      topItems: [...itemCounts.entries()]
        .map(([productId, v]) => ({ productId, name: v.name, quantity: v.quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
      paymentBreakdown: [...paymentMap.entries()].map(([method, v]) => ({
        method,
        amount: v.amount,
        count: v.count,
      })),
      busyHours,
    };
  }

  async openSession(cashierId: string, openingFloat = 0, terminalId?: string) {
    const existing = await this.prisma.posSession.findFirst({
      where: { cashierId, status: PosSessionStatus.OPEN },
    });
    if (existing) return existing;

    const branch = await this.prisma.branch.findFirst({ where: { isDefault: true } });
    return this.prisma.posSession.create({
      data: {
        branchId: branch!.id,
        cashierId,
        terminalId,
        openingFloat,
        status: PosSessionStatus.OPEN,
      },
    });
  }

  async closeSession(sessionId: string, closingCash: number, cashierId: string) {
    const session = await this.prisma.posSession.findUnique({ where: { id: sessionId } });
    if (!session || session.cashierId !== cashierId) {
      throw new ForbiddenException('Invalid session');
    }

    const closed = await this.prisma.posSession.update({
      where: { id: sessionId },
      data: {
        status: PosSessionStatus.CLOSED,
        closingCash,
        closedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: cashierId,
      action: 'POS_SHIFT_CLOSE',
      entity: 'PosSession',
      entityId: sessionId,
      description: `Shift closed. Sales: ₹${Number(session.totalSales)}`,
      newValue: { closingCash, totalSales: Number(session.totalSales) },
    });

    return closed;
  }

  async voidBill(billId: string, reason: string, userId: string, managerPin?: string) {
    const approver = await this.verifyManagerPin(managerPin);
    if (!approver) throw new ForbiddenException('Manager approval required to void bill');

    const existing = await this.prisma.order.findUnique({ where: { id: billId } });
    if (!existing) throw new NotFoundException('Bill not found');

    const updated = await this.prisma.order.update({
      where: { id: billId },
      data: { billStatus: PosBillStatus.VOIDED, status: OrderStatus.CANCELLED },
      include: billInclude,
    });

    if (existing.posTableId) {
      await this.updateTableStatus(existing.posTableId, PosTableStatus.AVAILABLE);
    }

    await this.audit.log({
      userId,
      action: 'POS_VOID',
      entity: 'Order',
      entityId: billId,
      description: reason,
    });

    return this.mapBill(updated);
  }

  async refundBill(
    billId: string,
    data: { amount: number; reason: string; managerPin?: string },
    userId: string,
  ) {
    const approver = await this.verifyManagerPin(data.managerPin);
    if (!approver) throw new ForbiddenException('Manager approval required for refund');

    const order = await this.prisma.order.findUnique({ where: { id: billId } });
    if (!order) throw new NotFoundException('Bill not found');

    await this.prisma.order.update({
      where: { id: billId },
      data: {
        billStatus: PosBillStatus.REFUNDED,
        paymentStatus: PaymentStatus.REFUNDED,
      },
    });

    if (order.posSessionId) {
      await this.prisma.posSession.update({
        where: { id: order.posSessionId },
        data: { totalRefunds: { increment: data.amount } },
      });
    }

    await this.audit.log({
      userId,
      action: 'POS_REFUND',
      entity: 'Order',
      entityId: billId,
      description: data.reason,
      newValue: { amount: data.amount },
    });

    return { success: true, amount: data.amount };
  }

  async cashTransaction(
    sessionId: string,
    type: 'IN' | 'OUT',
    amount: number,
    reason: string,
    userId: string,
  ) {
    await this.prisma.posCashTransaction.create({
      data: { sessionId, type, amount, reason, userId },
    });

    const field = type === 'IN' ? 'cashIn' : 'cashOut';
    await this.prisma.posSession.update({
      where: { id: sessionId },
      data: { [field]: { increment: amount } },
    });

    return { success: true };
  }

  async reorderFromBill(billId: string, cashierId: string) {
    const source = await this.prisma.order.findUnique({
      where: { id: billId },
      include: { items: true },
    });
    if (!source) throw new NotFoundException('Source bill not found');

    const bill = await this.createBill(
      {
        orderType: source.orderType,
        tableId: source.posTableId ?? undefined,
        customerName: source.customerName,
        customerPhone: source.customerPhone,
        customerId: source.userId ?? undefined,
        deliveryAddress: source.deliveryAddress ?? undefined,
        covers: source.covers ?? undefined,
      },
      cashierId,
    );

    for (const item of source.items) {
      await this.addItem(bill.id, {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions ?? undefined,
      });
    }

    return this.getBill(bill.id);
  }

  async syncOfflineQueue(
    terminalId: string,
    bills: {
      localId: string;
      orderType: OrderType;
      customerName?: string;
      customerPhone?: string;
      items: { productId: string; variantId?: string; quantity: number }[];
    }[],
    cashierId: string,
  ) {
    const results: { localId: string; orderId: string; orderNumber: string }[] = [];

    for (const draft of bills) {
      const bill = await this.createBill(
        {
          orderType: draft.orderType,
          customerName: draft.customerName,
          customerPhone: draft.customerPhone,
        },
        cashierId,
      );

      for (const item of draft.items) {
        await this.addItem(bill.id, item);
      }

      const settled = await this.settleBill(
        bill.id,
        { paymentMethod: PaymentMethod.CASH },
        cashierId,
      );

      await this.prisma.posOfflineQueue.create({
        data: {
          terminalId,
          payloadJson: { localId: draft.localId, orderId: settled.id },
          status: 'SYNCED',
          syncedAt: new Date(),
        },
      });

      results.push({
        localId: draft.localId,
        orderId: settled.id,
        orderNumber: settled.orderNumber,
      });
    }

    return results;
  }

  async getPosReports(period: 'today' | 'week' | 'month' = 'today') {
    const start = new Date();
    if (period === 'today') start.setHours(0, 0, 0, 0);
    else if (period === 'week') start.setDate(start.getDate() - 7);
    else start.setMonth(start.getMonth() - 1);

    const orders = await this.prisma.order.findMany({
      where: {
        orderSource: OrderSource.POS,
        createdAt: { gte: start },
        billStatus: PosBillStatus.SETTLED,
      },
      include: { items: true, posDiscounts: true, cashier: true, posTable: true },
    });

    return {
      totalSales: orders.reduce((s, o) => s + Number(o.grandTotal), 0),
      orderCount: orders.length,
      totalDiscount: orders.reduce((s, o) => s + Number(o.discount), 0),
      byCashier: Object.values(
        orders.reduce(
          (acc, o) => {
            const key = o.cashierId ?? 'unknown';
            if (!acc[key]) {
              acc[key] = {
                cashierName: o.cashier?.name ?? 'Unknown',
                sales: 0,
                orders: 0,
              };
            }
            acc[key].sales += Number(o.grandTotal);
            acc[key].orders += 1;
            return acc;
          },
          {} as Record<string, { cashierName: string; sales: number; orders: number }>,
        ),
      ),
      byTable: Object.values(
        orders.reduce(
          (acc, o) => {
            if (!o.posTable) return acc;
            const key = o.posTable.label;
            if (!acc[key]) acc[key] = { table: key, sales: 0, orders: 0 };
            acc[key].sales += Number(o.grandTotal);
            acc[key].orders += 1;
            return acc;
          },
          {} as Record<string, { table: string; sales: number; orders: number }>,
        ),
      ),
    };
  }

  async logSecurityEvent(userId: string, action: string, metadata?: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: { select: { name: true } } },
    });
    await this.audit.log({
      userId,
      userName: user?.name ?? undefined,
      userRole: user?.role?.name,
      action,
      entity: 'POS',
      description: action.replace(/_/g, ' '),
      metadata,
    });
    return { ok: true };
  }

  async verifyManagerPinPublic(pin: string) {
    const approver = await this.verifyManagerPin(pin);
    if (!approver) throw new ForbiddenException('Invalid manager PIN');
    return { ok: true };
  }
}
