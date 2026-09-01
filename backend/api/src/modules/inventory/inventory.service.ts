import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  InventoryItemStatus,
  StockMovementType,
  StockAdjustmentReason,
  PurchaseOrderStatus,
  WasteReason,
  InventoryUnit,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryPdfService } from './inventory-pdf.service';
import { resolvePublicAssetUrl } from '../notifications/email-branding';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private pdf: InventoryPdfService,
    private notifications: NotificationsService,
  ) {}

  private num(v: Prisma.Decimal | number): number {
    return Number(v);
  }

  private async refreshItemStatus(itemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return;
    const stock = this.num(item.currentStock);
    const min = this.num(item.minStock);
    let status: InventoryItemStatus = InventoryItemStatus.IN_STOCK;
    if (stock <= 0) status = InventoryItemStatus.OUT_OF_STOCK;
    else if (stock <= min) status = InventoryItemStatus.LOW_STOCK;
    await this.prisma.inventoryItem.update({ where: { id: itemId }, data: { status } });
  }

  private async recordMovement(
    itemId: string,
    type: StockMovementType,
    quantity: number,
    beforeQty: number,
    afterQty: number,
    reason?: string,
    reference?: string,
    userId?: string,
  ) {
    return this.prisma.stockMovement.create({
      data: {
        itemId,
        type,
        quantity,
        beforeQty,
        afterQty,
        reason,
        reference,
        userId,
      },
    });
  }

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);

    const items = await this.prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { category: true, supplier: true },
    });

    const stockValue = items.reduce(
      (s, i) => s + this.num(i.currentStock) * this.num(i.averageCost || i.costPrice),
      0,
    );

    const lowStock = items.filter((i) => i.status === InventoryItemStatus.LOW_STOCK).length;
    const outOfStock = items.filter((i) => i.status === InventoryItemStatus.OUT_OF_STOCK).length;

    const expiringSoon = await this.prisma.inventoryBatch.count({
      where: {
        expiryDate: { gte: todayStart, lte: weekAhead },
        remainingQty: { gt: 0 },
      },
    });

    const consumptionToday = await this.prisma.inventoryConsumption.findMany({
      where: { createdAt: { gte: todayStart } },
      include: { item: true },
    });
    const consumptionValue = consumptionToday.reduce(
      (s, c) => s + this.num(c.quantity) * this.num(c.item.averageCost || c.item.costPrice),
      0,
    );

    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const wasteMonth = await this.prisma.inventoryWaste.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costLoss: true },
    });
    const poMonth = await this.prisma.purchaseOrder.aggregate({
      where: {
        createdAt: { gte: monthStart },
        status: { not: PurchaseOrderStatus.CANCELLED },
      },
      _sum: { total: true },
    });
    const usedTodayKg = consumptionToday.reduce((s, c) => {
      const unit = c.item.unit;
      const qty = this.num(c.quantity);
      if (unit === 'KG') return s + qty;
      if (unit === 'GRAM') return s + qty / 1000;
      return s;
    }, 0);
    const purchaseValue = await this.prisma.goodsReceivedNote.findMany({
      where: { receivedAt: { gte: todayStart } },
      include: { items: { include: { item: true } } },
    });
    const purchaseTodayValue = purchaseValue.reduce(
      (s, g) =>
        s +
        g.items.reduce((si, gi) => si + this.num(gi.acceptedQty) * this.num(gi.item.costPrice), 0),
      0,
    );

    // Last 7 days consumption chart
    const consumptionChart: Array<{ date: string; value: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const dayConsumption = await this.prisma.inventoryConsumption.findMany({
        where: { createdAt: { gte: d, lt: end } },
        include: { item: true },
      });
      consumptionChart.push({
        date: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        value: dayConsumption.reduce(
          (s, c) => s + this.num(c.quantity) * this.num(c.item.costPrice),
          0,
        ),
      });
    }

    const lowStockAlerts = items
      .filter((i) => i.status !== InventoryItemStatus.IN_STOCK)
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        currentStock: this.num(i.currentStock),
        minStock: this.num(i.minStock),
        unit: i.unit,
        status: i.status,
      }));

    const recentPurchases = await this.prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { supplier: true },
    });

    const recentAdjustments = await this.prisma.stockAdjustment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { item: true },
    });

    const topConsumed = await this.prisma.inventoryConsumption.groupBy({
      by: ['itemId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    const recentMovements = await this.prisma.stockMovement.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { item: true },
    });

    const expiringBatches = await this.prisma.inventoryBatch.findMany({
      where: {
        expiryDate: { gte: todayStart, lte: weekAhead },
        remainingQty: { gt: 0 },
      },
      include: { item: true },
      orderBy: { expiryDate: 'asc' },
      take: 8,
    });

    const topConsumedItems = await Promise.all(
      topConsumed.map(async (t) => {
        const item = await this.prisma.inventoryItem.findUnique({ where: { id: t.itemId } });
        return { name: item?.name ?? 'Unknown', quantity: this.num(t._sum.quantity ?? 0) };
      }),
    );

    return {
      stats: {
        stockValue: Math.round(stockValue),
        totalItems: items.length,
        lowStock,
        outOfStock,
        expiringSoon,
        purchaseToday: Math.round(purchaseTodayValue),
        purchaseThisMonth: Math.round(this.num(poMonth._sum.total ?? 0)),
        consumptionToday: Math.round(consumptionValue),
        stockUsedToday: Math.round(usedTodayKg * 10) / 10,
        wasteThisMonth: Math.round(this.num(wasteMonth._sum.costLoss ?? 0)),
      },
      consumptionChart,
      lowStockAlerts,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        poNumber: p.poNumber,
        supplier: p.supplier.name,
        total: this.num(p.total),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
      recentAdjustments: recentAdjustments.map((a) => ({
        id: a.id,
        item: a.item.name,
        quantity: this.num(a.quantity),
        reason: a.reason,
        createdAt: a.createdAt.toISOString(),
      })),
      topConsumed: topConsumedItems,
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        item: m.item.name,
        type: m.type,
        quantity: this.num(m.quantity),
        afterQty: this.num(m.afterQty),
        reference: m.reference,
        createdAt: m.createdAt.toISOString(),
      })),
      expiringIngredients: expiringBatches.map((b) => ({
        id: b.id,
        itemName: b.item.name,
        remainingQty: this.num(b.remainingQty),
        unit: b.item.unit,
        expiryDate: b.expiryDate?.toISOString() ?? null,
        daysLeft: b.expiryDate
          ? Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      inventoryValue: items
        .map((i) => ({
          name: i.name,
          quantity: this.num(i.currentStock),
          unit: i.unit,
          value: this.num(i.currentStock) * this.num(i.averageCost || i.costPrice),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    };
  }

  async listItems(query: {
    search?: string;
    categoryId?: string;
    status?: InventoryItemStatus;
    lowStock?: boolean;
    supplierId?: string;
    locationId?: string;
    includeInactive?: boolean;
  }) {
    const where: Prisma.InventoryItemWhereInput = {};
    if (!query.includeInactive) where.isActive = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.status) where.status = query.status;
    if (query.lowStock)
      where.status = { in: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK] };

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: { category: true, supplier: true, location: true },
      orderBy: { name: 'asc' },
    });

    return items.map((i) => this.mapItem(i));
  }

  private mapItem(
    i: Prisma.InventoryItemGetPayload<{
      include: { category: true; supplier: true; location: true };
    }>,
  ) {
    return {
      id: i.id,
      name: i.name,
      sku: i.sku,
      barcode: i.barcode,
      categoryId: i.categoryId,
      categoryName: i.category.name,
      unit: i.unit,
      currentStock: this.num(i.currentStock),
      reservedStock: this.num(i.reservedStock),
      minStock: this.num(i.minStock),
      maxStock: this.num(i.maxStock),
      costPrice: this.num(i.costPrice),
      averageCost: this.num(i.averageCost),
      stockValue: this.num(i.currentStock) * this.num(i.averageCost || i.costPrice),
      supplierId: i.supplierId,
      supplierName: i.supplier?.name ?? null,
      locationId: i.locationId,
      locationName: i.location?.name ?? null,
      expiryTracking: i.expiryTracking,
      customUnit: i.customUnit,
      lotNumber: i.lotNumber,
      expiryDate: i.expiryDate?.toISOString() ?? null,
      notes: i.notes,
      status: i.status,
      isActive: i.isActive,
      createdAt: i.createdAt.toISOString(),
    };
  }

  async getItem(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        location: true,
        batches: { orderBy: { expiryDate: 'asc' } },
        movements: { take: 100, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return {
      ...this.mapItem(item),
      batches: item.batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate?.toISOString() ?? null,
        remainingQty: this.num(b.remainingQty),
        costPrice: this.num(b.costPrice),
      })),
      movements: item.movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: this.num(m.quantity),
        beforeQty: this.num(m.beforeQty),
        afterQty: this.num(m.afterQty),
        reason: m.reason,
        reference: m.reference,
        createdAt: m.createdAt.toISOString(),
        userId: m.userId,
      })),
    };
  }

  async createItem(data: Prisma.InventoryItemCreateInput) {
    const opening = this.num((data.currentStock as number) ?? 0);
    const item = await this.prisma.inventoryItem.create({
      data,
      include: { category: true, supplier: true, location: true },
    });
    if (opening > 0) {
      await this.recordMovement(
        item.id,
        StockMovementType.STOCK_IN,
        opening,
        0,
        opening,
        'Opening stock',
        'OPENING',
      );
    }
    await this.refreshItemStatus(item.id);
    return this.mapItem(item);
  }

  async updateItem(id: string, data: Record<string, unknown>) {
    const {
      currentStock: _stock,
      reservedStock: _reserved,
      averageCost: _avg,
      status: _status,
      id: _id,
      supplierId,
      locationId,
      categoryId,
      expiryDate,
      ...rest
    } = data;
    const prismaData: Prisma.InventoryItemUpdateInput = {
      ...(rest as Prisma.InventoryItemUpdateInput),
    };
    if (typeof supplierId === 'string') {
      prismaData.supplier = supplierId ? { connect: { id: supplierId } } : { disconnect: true };
    } else if (supplierId === null) {
      prismaData.supplier = { disconnect: true };
    }
    if (typeof locationId === 'string') {
      prismaData.location = locationId ? { connect: { id: locationId } } : { disconnect: true };
    } else if (locationId === null) {
      prismaData.location = { disconnect: true };
    }
    if (typeof categoryId === 'string' && categoryId) {
      prismaData.category = { connect: { id: categoryId } };
    }
    if (expiryDate === null || expiryDate === '') {
      prismaData.expiryDate = null;
    } else if (typeof expiryDate === 'string') {
      prismaData.expiryDate = new Date(expiryDate);
    }
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: prismaData,
      include: { category: true, supplier: true, location: true },
    });
    await this.refreshItemStatus(id);
    return this.mapItem(item);
  }

  async setItemActive(id: string, isActive: boolean) {
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: { isActive },
      include: { category: true, supplier: true, location: true },
    });
    return this.mapItem(item);
  }

  async adjustStock(
    itemId: string,
    quantity: number,
    reason: StockAdjustmentReason,
    notes?: string,
    userId?: string,
  ) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const before = this.num(item.currentStock);
    const delta =
      reason === StockAdjustmentReason.REMOVE ||
      reason === StockAdjustmentReason.LOSS ||
      reason === StockAdjustmentReason.DAMAGE
        ? -Math.abs(quantity)
        : Math.abs(quantity);
    const after = before + delta;
    if (after < 0) throw new BadRequestException('Insufficient stock');

    await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: after },
    });

    const movementType =
      reason === StockAdjustmentReason.RETURN
        ? StockMovementType.RETURN
        : reason === StockAdjustmentReason.TRANSFER
          ? delta >= 0
            ? StockMovementType.TRANSFER_IN
            : StockMovementType.TRANSFER_OUT
          : reason === StockAdjustmentReason.CORRECTION
            ? StockMovementType.CORRECTION
            : delta >= 0
              ? StockMovementType.STOCK_IN
              : StockMovementType.STOCK_OUT;

    await this.recordMovement(
      itemId,
      movementType,
      Math.abs(delta),
      before,
      after,
      reason,
      notes,
      userId,
    );

    await this.prisma.stockAdjustment.create({
      data: { itemId, quantity: delta, reason, notes, userId },
    });

    await this.refreshItemStatus(itemId);
    return { before, after, delta };
  }

  async recordWaste(
    itemId: string,
    quantity: number,
    reason: WasteReason,
    notes?: string,
    userId?: string,
  ) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const before = this.num(item.currentStock);
    const after = before - quantity;
    if (after < 0) throw new BadRequestException('Insufficient stock');

    const costLoss = quantity * this.num(item.costPrice);

    await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: after },
    });
    await this.recordMovement(
      itemId,
      StockMovementType.WASTE,
      quantity,
      before,
      after,
      reason,
      notes,
      userId,
    );
    await this.prisma.inventoryWaste.create({
      data: { itemId, quantity, reason, costLoss, notes, userId },
    });
    await this.refreshItemStatus(itemId);
    return { costLoss };
  }

  async listSuppliers(includeInactive = false) {
    const suppliers = await this.prisma.supplier.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { items: true, purchaseOrders: true } },
        purchaseOrders: {
          where: { status: { not: PurchaseOrderStatus.CANCELLED } },
          select: { total: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return suppliers.map((s) => ({
      ...s,
      totalPurchases: s.purchaseOrders.reduce((sum, p) => sum + this.num(p.total), 0),
      purchaseOrders: undefined,
    }));
  }

  async getSupplier(id: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return {
      ...s,
      totalPurchases: s.purchaseOrders
        .filter((p) => p.status !== PurchaseOrderStatus.CANCELLED)
        .reduce((sum, p) => sum + this.num(p.total), 0),
    };
  }

  async createSupplier(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data });
  }

  async updateSupplier(id: string, data: Prisma.SupplierUpdateInput) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async setSupplierActive(id: string, isActive: boolean) {
    return this.prisma.supplier.update({ where: { id }, data: { isActive } });
  }

  async listCategories() {
    const existing = await this.prisma.inventoryCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    if (existing.length) return existing;
    return [
      await this.prisma.inventoryCategory.create({
        data: { name: 'General', slug: 'general' },
      }),
    ];
  }

  async listLocations() {
    return this.prisma.inventoryLocation.findMany({ where: { isActive: true } });
  }

  async listPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchaseOrder(data: {
    supplierId: string;
    items: Array<{ itemId: string; quantity: number; rate: number; tax?: number }>;
    notes?: string;
    expectedDeliveryDate?: string;
    supplierRef?: string;
    paymentTerms?: string;
    discount?: number;
    deliveryCharge?: number;
    otherCharges?: number;
    orderDate?: string;
    createdById?: string;
  }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: { poNumber: { startsWith: `PO-${year}-` } },
    });
    const poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let tax = 0;
    const itemsData = data.items.map((i) => {
      const itemTax = i.tax ?? 0;
      const line = i.quantity * i.rate;
      subtotal += line;
      tax += itemTax;
      return {
        itemId: i.itemId,
        quantity: i.quantity,
        rate: i.rate,
        tax: itemTax,
        total: line + itemTax,
      };
    });
    const discount = data.discount ?? 0;
    const deliveryCharge = data.deliveryCharge ?? 0;
    const otherCharges = data.otherCharges ?? 0;
    const total = subtotal - discount + tax + deliveryCharge + otherCharges;

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        subtotal,
        discount,
        tax,
        deliveryCharge,
        otherCharges,
        total,
        notes: data.notes,
        supplierRef: data.supplierRef,
        paymentTerms: data.paymentTerms,
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : undefined,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        createdById: data.createdById,
        items: { create: itemsData },
      },
      include: { supplier: true, items: { include: { item: true } } },
    });
  }

  private normalizePoStatus(status: PurchaseOrderStatus): PurchaseOrderStatus {
    if (status === PurchaseOrderStatus.SENT || status === PurchaseOrderStatus.APPROVED) {
      return PurchaseOrderStatus.ORDERED;
    }
    if (status === PurchaseOrderStatus.CLOSED) return PurchaseOrderStatus.RECEIVED;
    return status;
  }

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const current = this.normalizePoStatus(po.status);
    const next = this.normalizePoStatus(status);
    const allowed: Record<string, PurchaseOrderStatus[]> = {
      DRAFT: [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CANCELLED],
      ORDERED: [
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.CANCELLED,
      ],
      PARTIALLY_RECEIVED: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
      RECEIVED: [],
      CANCELLED: [],
    };
    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Cannot change PO from ${current} to ${next}`);
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: next },
      include: { supplier: true, items: { include: { item: true } } },
    });
  }

  async getPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { item: true } },
        grns: { include: { items: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async receiveGRN(
    data: {
      poId: string;
      invoiceNumber?: string;
      remarks?: string;
      items: Array<{
        itemId: string;
        receivedQty: number;
        damagedQty?: number;
        acceptedQty?: number;
        rejectedQty?: number;
        expiryDate?: string;
        batchNumber?: string;
      }>;
    },
    userId?: string,
  ) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: data.poId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    const current = this.normalizePoStatus(po.status);
    if (
      current === PurchaseOrderStatus.CANCELLED ||
      current === PurchaseOrderStatus.RECEIVED ||
      current === PurchaseOrderStatus.DRAFT
    ) {
      throw new BadRequestException(
        'This purchase order cannot receive stock in its current status',
      );
    }

    const { result, nextStatus, poNumber } = await this.prisma.$transaction(async (tx) => {
      const count = await tx.goodsReceivedNote.count();
      const grnNumber = `GRN-${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
      const grn = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId: data.poId,
          invoiceNumber: data.invoiceNumber,
          remarks: data.remarks,
          items: {
            create: data.items.map((i) => {
              const received = Math.max(0, i.receivedQty);
              const damaged = Math.max(0, i.damagedQty ?? 0);
              const accepted = Math.max(0, i.acceptedQty ?? received - damaged);
              return {
                itemId: i.itemId,
                receivedQty: received,
                damagedQty: damaged,
                acceptedQty: accepted,
                rejectedQty: i.rejectedQty ?? 0,
              };
            }),
          },
        },
        include: { items: { include: { item: true } } },
      });

      for (const gi of grn.items) {
        const poLine = po.items.find((p) => p.itemId === gi.itemId);
        const requested = this.num(gi.acceptedQty);
        if (requested <= 0) continue;
        const already = poLine ? this.num(poLine.receivedQty) : 0;
        const ordered = poLine ? this.num(poLine.quantity) : requested;
        const pending = Math.max(0, ordered - already);
        const accepted = Math.min(requested, pending);
        if (accepted <= 0) continue;
        if (accepted !== requested) {
          await tx.grnItem.update({
            where: { id: gi.id },
            data: { acceptedQty: accepted, receivedQty: accepted },
          });
        }
        const item = await tx.inventoryItem.findUnique({ where: { id: gi.itemId } });
        if (!item) continue;
        const before = this.num(item.currentStock);
        const after = before + accepted;
        const prevCost = this.num(item.averageCost || item.costPrice);
        const incomingCost = this.num(item.costPrice);
        const avg =
          after > 0 ? (before * prevCost + accepted * incomingCost) / after : incomingCost;

        await tx.inventoryItem.update({
          where: { id: gi.itemId },
          data: { currentStock: after, averageCost: avg },
        });
        await tx.stockMovement.create({
          data: {
            itemId: gi.itemId,
            type: StockMovementType.PURCHASE,
            quantity: accepted,
            beforeQty: before,
            afterQty: after,
            reason: 'Stock received',
            reference: po.poNumber,
            userId,
          },
        });
        const line = data.items.find((x) => x.itemId === gi.itemId);
        await tx.inventoryBatch.create({
          data: {
            itemId: gi.itemId,
            batchNumber: line?.batchNumber || `${grnNumber}-${gi.itemId.slice(-4)}`,
            quantity: accepted,
            remainingQty: accepted,
            costPrice: this.num(item.costPrice),
            expiryDate: line?.expiryDate ? new Date(line.expiryDate) : undefined,
            supplierId: item.supplierId,
            locationId: item.locationId,
          },
        });
        if (poLine) {
          await tx.purchaseOrderItem.update({
            where: { id: poLine.id },
            data: { receivedQty: already + accepted },
          });
        }
        const stock = after;
        const min = this.num(item.minStock);
        const status =
          stock <= 0
            ? InventoryItemStatus.OUT_OF_STOCK
            : stock <= min
              ? InventoryItemStatus.LOW_STOCK
              : InventoryItemStatus.IN_STOCK;
        await tx.inventoryItem.update({ where: { id: gi.itemId }, data: { status } });
      }

      const lines = await tx.purchaseOrderItem.findMany({ where: { poId: data.poId } });
      const allReceived = lines.every(
        (l) => this.num(l.receivedQty) + 0.0001 >= this.num(l.quantity),
      );
      const anyReceived = lines.some((l) => this.num(l.receivedQty) > 0);
      const nextStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : anyReceived
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : PurchaseOrderStatus.ORDERED;
      await tx.purchaseOrder.update({ where: { id: data.poId }, data: { status: nextStatus } });
      const result = await tx.goodsReceivedNote.findUniqueOrThrow({
        where: { id: grn.id },
        include: { items: { include: { item: true } }, po: true },
      });
      return { result, nextStatus, poNumber: po.poNumber };
    });

    void this.notifyPo(data.poId, poNumber, nextStatus);
    return result;
  }

  async listRecipes() {
    return this.prisma.recipe.findMany({
      include: {
        product: true,
        items: { include: { item: true } },
      },
    });
  }

  async createRecipe(data: {
    productId: string;
    name: string;
    items: Array<{ itemId: string; quantity: number; unit: InventoryUnit }>;
  }) {
    return this.prisma.recipe.upsert({
      where: { productId: data.productId },
      update: {
        name: data.name,
        items: {
          deleteMany: {},
          create: data.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
      create: {
        productId: data.productId,
        name: data.name,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
      include: { product: true, items: { include: { item: true } } },
    });
  }

  /** Auto-deduct ingredients once per order (idempotent via unique orderId+itemId). */
  async deductForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const alreadyDeducted = await this.prisma.inventoryConsumption.count({ where: { orderId } });
    if (alreadyDeducted > 0) return;

    const usage = new Map<string, number>();
    for (const orderItem of order.items) {
      const recipe = await this.prisma.recipe.findUnique({
        where: { productId: orderItem.productId },
        include: { items: { include: { item: true } } },
      });
      if (!recipe) continue;
      for (const ri of recipe.items) {
        const qty =
          this.convertQty(this.num(ri.quantity), ri.unit, ri.item.unit) * orderItem.quantity;
        usage.set(ri.itemId, (usage.get(ri.itemId) ?? 0) + qty);
      }
    }
    if (usage.size === 0) return;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryConsumption.count({ where: { orderId } });
      if (existing > 0) return;
      for (const [itemId, deductQty] of usage) {
        const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) continue;
        const before = this.num(item.currentStock);
        const after = Math.max(0, before - deductQty);
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: after },
        });
        await tx.stockMovement.create({
          data: {
            itemId,
            type: StockMovementType.RECIPE_USAGE,
            quantity: deductQty,
            beforeQty: before,
            afterQty: after,
            reason: 'Recipe consumption',
            reference: order.orderNumber,
          },
        });
        await tx.inventoryConsumption.create({
          data: { orderId, itemId, quantity: deductQty },
        });
        const min = this.num(item.minStock);
        const status =
          after <= 0
            ? InventoryItemStatus.OUT_OF_STOCK
            : after <= min
              ? InventoryItemStatus.LOW_STOCK
              : InventoryItemStatus.IN_STOCK;
        await tx.inventoryItem.update({ where: { id: itemId }, data: { status } });
      }
    });

    await this.maybeNotifyLowStock([...usage.keys()]);
    await this.applyMenuAvailability();
  }

  private convertQty(qty: number, from: InventoryUnit, to: InventoryUnit) {
    if (from === to) return qty;
    if ((from === 'KG' || from === 'GRAM') && (to === 'KG' || to === 'GRAM')) {
      const grams = from === 'KG' ? qty * 1000 : qty;
      return to === 'KG' ? grams / 1000 : grams;
    }
    if ((from === 'LITRE' || from === 'ML') && (to === 'LITRE' || to === 'ML')) {
      const ml = from === 'LITRE' ? qty * 1000 : qty;
      return to === 'LITRE' ? ml / 1000 : ml;
    }
    return qty;
  }

  async getExpiringBatches(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const batches = await this.prisma.inventoryBatch.findMany({
      where: { expiryDate: { lte: cutoff, gte: new Date() }, remainingQty: { gt: 0 } },
      include: { item: true, supplier: true },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((b) => {
      const daysLeft = b.expiryDate
        ? Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: b.id,
        itemName: b.item.name,
        batchNumber: b.batchNumber,
        remainingQty: this.num(b.remainingQty),
        unit: b.item.unit,
        expiryDate: b.expiryDate?.toISOString() ?? null,
        daysLeft,
        urgency:
          daysLeft !== null && daysLeft <= 0
            ? 'red'
            : daysLeft !== null && daysLeft <= 3
              ? 'orange'
              : daysLeft !== null && daysLeft <= 7
                ? 'yellow'
                : 'green',
      };
    });
  }

  async getWasteReport(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const wastes = await this.prisma.inventoryWaste.findMany({
      where: { createdAt: { gte: since } },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalLoss = wastes.reduce((s, w) => s + this.num(w.costLoss), 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const wasteToday = wastes
      .filter((w) => w.createdAt >= todayStart)
      .reduce((s, w) => s + this.num(w.costLoss), 0);
    const top = new Map<string, { name: string; quantity: number; cost: number }>();
    for (const w of wastes) {
      const cur = top.get(w.itemId) ?? { name: w.item.name, quantity: 0, cost: 0 };
      cur.quantity += this.num(w.quantity);
      cur.cost += this.num(w.costLoss);
      top.set(w.itemId, cur);
    }
    return {
      wastes,
      totalLoss,
      wasteToday,
      wasteThisMonth: wastes
        .filter((w) => w.createdAt >= monthStart)
        .reduce((s, w) => s + this.num(w.costLoss), 0),
      topWasted: [...top.values()].sort((a, b) => b.cost - a.cost).slice(0, 8),
    };
  }

  async listMovements(query: {
    itemId?: string;
    type?: StockMovementType;
    reference?: string;
    from?: string;
    to?: string;
  }) {
    const where: Prisma.StockMovementWhereInput = {};
    if (query.itemId) where.itemId = query.itemId;
    if (query.type) where.type = query.type;
    if (query.reference) where.reference = { contains: query.reference, mode: 'insensitive' };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    const rows = await this.prisma.stockMovement.findMany({
      where,
      include: { item: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemName: m.item.name,
      unit: m.item.unit,
      type: m.type,
      quantity: this.num(m.quantity),
      beforeQty: this.num(m.beforeQty),
      afterQty: this.num(m.afterQty),
      reason: m.reason,
      reference: m.reference,
      userId: m.userId,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async findByBarcode(code: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { OR: [{ barcode: code }, { sku: code }] },
      include: { category: true, supplier: true, location: true },
    });
    if (!item) throw new NotFoundException('No ingredient matches that barcode or SKU');
    return this.mapItem(item);
  }

  async duplicatePurchaseOrder(id: string, createdById?: string) {
    const po = await this.getPurchaseOrder(id);
    return this.createPurchaseOrder({
      supplierId: po.supplierId,
      items: po.items.map((i) => ({
        itemId: i.itemId,
        quantity: this.num(i.quantity),
        rate: this.num(i.rate),
        tax: this.num(i.tax),
      })),
      notes: po.notes ?? undefined,
      paymentTerms: po.paymentTerms ?? undefined,
      createdById,
    });
  }

  async updateDraftPurchaseOrder(
    id: string,
    data: {
      supplierId?: string;
      items?: Array<{ itemId: string; quantity: number; rate: number; tax?: number }>;
      notes?: string;
      expectedDeliveryDate?: string;
      supplierRef?: string;
      paymentTerms?: string;
      discount?: number;
      deliveryCharge?: number;
      otherCharges?: number;
    },
  ) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    const status = this.normalizePoStatus(po.status);
    if (status !== PurchaseOrderStatus.DRAFT && status !== PurchaseOrderStatus.ORDERED) {
      throw new BadRequestException('This purchase order can no longer be edited');
    }
    if (status === PurchaseOrderStatus.ORDERED && data.items) {
      throw new BadRequestException('Ordered purchase orders cannot change line items');
    }
    let totals: Prisma.PurchaseOrderUpdateInput = {};
    if (data.items && status === PurchaseOrderStatus.DRAFT) {
      let subtotal = 0;
      let tax = 0;
      const itemsData = data.items.map((i) => {
        const itemTax = i.tax ?? 0;
        const line = i.quantity * i.rate;
        subtotal += line;
        tax += itemTax;
        return {
          itemId: i.itemId,
          quantity: i.quantity,
          rate: i.rate,
          tax: itemTax,
          total: line + itemTax,
        };
      });
      const discount = data.discount ?? this.num(po.discount);
      const deliveryCharge = data.deliveryCharge ?? this.num(po.deliveryCharge);
      const otherCharges = data.otherCharges ?? this.num(po.otherCharges);
      totals = {
        subtotal,
        tax,
        discount,
        deliveryCharge,
        otherCharges,
        total: subtotal - discount + tax + deliveryCharge + otherCharges,
        items: { deleteMany: {}, create: itemsData },
      };
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...totals,
        notes: data.notes,
        supplierRef: data.supplierRef,
        paymentTerms: data.paymentTerms,
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : undefined,
        ...(data.supplierId && status === PurchaseOrderStatus.DRAFT
          ? { supplier: { connect: { id: data.supplierId } } }
          : {}),
      },
      include: { supplier: true, items: { include: { item: true } } },
    });
  }

  async generatePurchaseOrderPdf(id: string) {
    const po = await this.getPurchaseOrder(id);
    const settings = await this.prisma.businessSettings.findFirst();
    const theme = await this.prisma.themeSettings.findFirst({ select: { logoUrl: true } });
    let logo: Buffer | null = null;
    const logoUrl = resolvePublicAssetUrl(
      theme?.logoUrl,
      process.env.WEBSITE_URL || 'https://mercydosahouse.com',
    );
    if (logoUrl) {
      try {
        const res = await fetch(logoUrl);
        if (res.ok) logo = Buffer.from(await res.arrayBuffer());
      } catch {
        logo = null;
      }
    }
    const buffer = await this.pdf.purchaseOrderPdf({
      poNumber: po.poNumber,
      poDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      supplierName: po.supplier.name,
      supplierContact: po.supplier.contactPerson,
      supplierPhone: po.supplier.phone,
      supplierAddress: po.supplier.address,
      supplierGst: po.supplier.gstNumber,
      paymentTerms: po.paymentTerms,
      notes: po.notes,
      items: po.items.map((i) => ({
        name: i.item.name,
        quantity: this.num(i.quantity),
        unit: i.item.unit,
        rate: this.num(i.rate),
        tax: this.num(i.tax),
        amount: this.num(i.total),
      })),
      subtotal: this.num(po.subtotal),
      discount: this.num(po.discount),
      tax: this.num(po.tax),
      deliveryCharge: this.num(po.deliveryCharge),
      otherCharges: this.num(po.otherCharges),
      grandTotal: this.num(po.total),
      business: {
        name: settings?.businessName ?? 'Mercy Dosa House',
        address: settings?.address,
        phone: settings?.phone,
        email: settings?.email,
        gstin: settings?.gstNumber,
      },
      deliveryAddress: settings?.address,
      logo,
    });
    return { buffer, filename: `${po.poNumber}.pdf` };
  }

  async getReports(query: { type?: string; from?: string; to?: string }) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 86400000);
    const type = query.type ?? 'valuation';
    if (type === 'valuation') {
      const items = await this.prisma.inventoryItem.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      return items.map((i) => ({
        ingredient: i.name,
        sku: i.sku,
        quantity: this.num(i.currentStock),
        unit: i.unit,
        averageCost: this.num(i.averageCost || i.costPrice),
        totalValue: this.num(i.currentStock) * this.num(i.averageCost || i.costPrice),
      }));
    }
    if (type === 'purchase') {
      const pos = await this.prisma.purchaseOrder.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          status: { not: PurchaseOrderStatus.CANCELLED },
        },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      });
      return pos.map((p) => ({
        supplier: p.supplier.name,
        po: p.poNumber,
        date: p.createdAt.toISOString(),
        status: p.status,
        amount: this.num(p.total),
      }));
    }
    if (type === 'consumption') {
      const items = await this.prisma.inventoryItem.findMany({ where: { isActive: true } });
      const rows: Array<{
        ingredient: string;
        opening: number;
        purchased: number;
        consumed: number;
        waste: number;
        closing: number;
      }> = [];
      for (const item of items) {
        const openingMove = await this.prisma.stockMovement.findFirst({
          where: { itemId: item.id, createdAt: { lte: from } },
          orderBy: { createdAt: 'desc' },
        });
        const movements = await this.prisma.stockMovement.findMany({
          where: { itemId: item.id, createdAt: { gte: from, lte: to } },
        });
        const purchased = movements
          .filter((m) => m.type === StockMovementType.PURCHASE || m.type === StockMovementType.GRN)
          .reduce((s, m) => s + this.num(m.quantity), 0);
        const consumed = movements
          .filter(
            (m) =>
              m.type === StockMovementType.CONSUMPTION || m.type === StockMovementType.RECIPE_USAGE,
          )
          .reduce((s, m) => s + this.num(m.quantity), 0);
        const waste = movements
          .filter((m) => m.type === StockMovementType.WASTE)
          .reduce((s, m) => s + this.num(m.quantity), 0);
        const opening = openingMove ? this.num(openingMove.afterQty) : this.num(item.currentStock);
        rows.push({
          ingredient: item.name,
          opening,
          purchased,
          consumed,
          waste,
          closing: this.num(item.currentStock),
        });
      }
      return rows;
    }
    const wastes = await this.prisma.inventoryWaste.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    return wastes.map((w) => ({
      ingredient: w.item.name,
      quantity: this.num(w.quantity),
      reason: w.reason,
      cost: this.num(w.costLoss),
      date: w.createdAt.toISOString(),
    }));
  }

  async getMenuAvailability() {
    const recipes = await this.prisma.recipe.findMany({
      include: { product: true, items: { include: { item: true } } },
    });
    return recipes.map((r) => {
      const shortages = r.items
        .filter(
          (ri) =>
            this.num(ri.item.currentStock) <
            this.convertQty(this.num(ri.quantity), ri.unit, ri.item.unit),
        )
        .map((ri) => ({
          ingredient: ri.item.name,
          current: this.num(ri.item.currentStock),
          required: this.convertQty(this.num(ri.quantity), ri.unit, ri.item.unit),
          unit: ri.item.unit,
        }));
      return {
        productId: r.productId,
        productName: r.product.name,
        isAvailable: r.product.isAvailable,
        shortages,
        warning: shortages.length
          ? `Insufficient ${shortages.map((s) => s.ingredient).join(', ')} stock`
          : null,
      };
    });
  }

  async applyMenuAvailability() {
    const settings = await this.prisma.businessSettings.findFirst();
    if (!settings?.autoMenuAvailability) return;
    const rows = await this.getMenuAvailability();
    for (const row of rows) {
      if (row.shortages.length && row.isAvailable) {
        await this.prisma.product.update({
          where: { id: row.productId },
          data: { isAvailable: false },
        });
      }
    }
  }

  async listExpiryBuckets() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return d;
    };
    const mapBatch = async (where: Prisma.InventoryBatchWhereInput) => {
      const batches = await this.prisma.inventoryBatch.findMany({
        where: { remainingQty: { gt: 0 }, ...where },
        include: { item: true },
        orderBy: { expiryDate: 'asc' },
      });
      return batches.map((b) => ({
        id: b.id,
        itemName: b.item.name,
        remainingQty: this.num(b.remainingQty),
        unit: b.item.unit,
        expiryDate: b.expiryDate?.toISOString() ?? null,
        daysLeft: b.expiryDate ? Math.ceil((b.expiryDate.getTime() - Date.now()) / 86400000) : null,
      }));
    };
    return {
      expired: await mapBatch({ expiryDate: { lt: now } }),
      today: await mapBatch({ expiryDate: { gte: now, lt: end(1) } }),
      within3: await mapBatch({ expiryDate: { gte: end(1), lt: end(4) } }),
      within7: await mapBatch({ expiryDate: { gte: end(4), lt: end(8) } }),
    };
  }

  async notifyExpiryAlerts() {
    const buckets = await this.listExpiryBuckets();
    for (const row of [...buckets.today, ...buckets.within3]) {
      await this.notifications.emitStaffInbox({
        eventKey: `INV:BATCH:${row.id}:EXPIRY`,
        type: NotificationType.INVENTORY_EXPIRY,
        category: 'INVENTORY',
        priority: 'HIGH',
        title: '⏰ Ingredient expiring soon',
        body: `${row.itemName} expires in ${row.daysLeft ?? 0} day(s).`,
        referenceType: 'INVENTORY_BATCH',
        referenceId: row.id,
      });
    }
  }

  private async maybeNotifyLowStock(itemIds: string[]) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
    });
    for (const item of items) {
      const stock = this.num(item.currentStock);
      const min = this.num(item.minStock);
      if (stock <= 0) {
        await this.notifications.emitStaffInbox({
          eventKey: `INV:${item.id}:OUT`,
          type: NotificationType.INVENTORY_OUT,
          category: 'INVENTORY',
          priority: 'HIGH',
          title: '🔴 Ingredient out of stock',
          body: `${item.name} is out of stock.`,
          referenceType: 'INVENTORY_ITEM',
          referenceId: item.id,
        });
      } else if (stock <= min) {
        await this.notifications.emitStaffInbox({
          eventKey: `INV:${item.id}:LOW`,
          type: NotificationType.INVENTORY,
          category: 'INVENTORY',
          priority: 'HIGH',
          title: '⚠️ Low stock',
          body: `${item.name} is below minimum stock.\nCurrent: ${stock} ${item.unit} • Minimum: ${min} ${item.unit}`,
          referenceType: 'INVENTORY_ITEM',
          referenceId: item.id,
          metadata: { currentStock: stock, minStock: min, unit: item.unit },
        });
      }
    }
  }

  private async notifyPo(poId: string, poNumber: string, status: PurchaseOrderStatus) {
    const partial = status === PurchaseOrderStatus.PARTIALLY_RECEIVED;
    await this.notifications.emitStaffInbox({
      eventKey: `PO:${poId}:${status}`,
      type: NotificationType.PURCHASE_ORDER,
      category: 'INVENTORY',
      title: partial ? '📋 Purchase order partially received' : '📦 Purchase order received',
      body: partial ? `${poNumber} is partially received.` : `${poNumber} has been received.`,
      referenceType: 'PURCHASE_ORDER',
      referenceId: poId,
    });
  }
}
