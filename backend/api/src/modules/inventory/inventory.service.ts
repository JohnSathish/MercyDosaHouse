import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  InventoryItemStatus,
  StockMovementType,
  StockAdjustmentReason,
  PurchaseOrderStatus,
  WasteReason,
  InventoryUnit,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

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

    const purchaseToday = await this.prisma.stockMovement.aggregate({
      where: {
        type: { in: [StockMovementType.PURCHASE, StockMovementType.GRN] },
        createdAt: { gte: todayStart },
      },
      _sum: { quantity: true },
    });

    const consumptionToday = await this.prisma.inventoryConsumption.findMany({
      where: { createdAt: { gte: todayStart } },
      include: { item: true },
    });
    const consumptionValue = consumptionToday.reduce(
      (s, c) => s + this.num(c.quantity) * this.num(c.item.averageCost || c.item.costPrice),
      0,
    );

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
        consumptionToday: Math.round(consumptionValue),
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
    };
  }

  async listItems(query: {
    search?: string;
    categoryId?: string;
    status?: InventoryItemStatus;
    lowStock?: boolean;
  }) {
    const where: Prisma.InventoryItemWhereInput = { isActive: true };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
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
        movements: { take: 20, orderBy: { createdAt: 'desc' } },
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
      })),
    };
  }

  async createItem(data: Prisma.InventoryItemCreateInput) {
    const item = await this.prisma.inventoryItem.create({
      data,
      include: { category: true, supplier: true, location: true },
    });
    await this.refreshItemStatus(item.id);
    return this.mapItem(item);
  }

  async updateItem(id: string, data: Prisma.InventoryItemUpdateInput) {
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data,
      include: { category: true, supplier: true, location: true },
    });
    await this.refreshItemStatus(id);
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
      delta >= 0 ? StockMovementType.ADJUSTMENT_ADD : StockMovementType.ADJUSTMENT_REMOVE;

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

  async listSuppliers() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      include: { _count: { select: { items: true, purchaseOrders: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data });
  }

  async listCategories() {
    return this.prisma.inventoryCategory.findMany({ orderBy: { sortOrder: 'asc' } });
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
  }) {
    const count = await this.prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let tax = 0;
    const itemsData = data.items.map((i) => {
      const itemTax = i.tax ?? 0;
      const itemTotal = i.quantity * i.rate + itemTax;
      subtotal += i.quantity * i.rate;
      tax += itemTax;
      return {
        itemId: i.itemId,
        quantity: i.quantity,
        rate: i.rate,
        tax: itemTax,
        total: itemTotal,
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        subtotal,
        tax,
        total: subtotal + tax,
        notes: data.notes,
        items: { create: itemsData },
      },
      include: { supplier: true, items: { include: { item: true } } },
    });
  }

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status } });
  }

  async receiveGRN(data: {
    poId: string;
    invoiceNumber?: string;
    remarks?: string;
    items: Array<{
      itemId: string;
      receivedQty: number;
      damagedQty?: number;
      acceptedQty: number;
      rejectedQty?: number;
    }>;
  }) {
    const count = await this.prisma.goodsReceivedNote.count();
    const grnNumber = `GRN-${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;

    const grn = await this.prisma.goodsReceivedNote.create({
      data: {
        grnNumber,
        poId: data.poId,
        invoiceNumber: data.invoiceNumber,
        remarks: data.remarks,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            receivedQty: i.receivedQty,
            damagedQty: i.damagedQty ?? 0,
            acceptedQty: i.acceptedQty,
            rejectedQty: i.rejectedQty ?? 0,
          })),
        },
      },
      include: { items: { include: { item: true } } },
    });

    for (const gi of grn.items) {
      const accepted = this.num(gi.acceptedQty);
      if (accepted <= 0) continue;

      const item = await this.prisma.inventoryItem.findUnique({ where: { id: gi.itemId } });
      if (!item) continue;

      const before = this.num(item.currentStock);
      const after = before + accepted;

      await this.prisma.inventoryItem.update({
        where: { id: gi.itemId },
        data: {
          currentStock: after,
          costPrice: this.num(gi.item.costPrice) || this.num(item.costPrice),
        },
      });

      await this.recordMovement(
        gi.itemId,
        StockMovementType.GRN,
        accepted,
        before,
        after,
        'GRN received',
        grnNumber,
      );

      await this.prisma.inventoryBatch.create({
        data: {
          itemId: gi.itemId,
          batchNumber: `${grnNumber}-${gi.itemId.slice(-4)}`,
          quantity: accepted,
          remainingQty: accepted,
          costPrice: this.num(item.costPrice),
          supplierId: item.supplierId,
          locationId: item.locationId,
        },
      });

      await this.refreshItemStatus(gi.itemId);
    }

    await this.prisma.purchaseOrder.update({
      where: { id: data.poId },
      data: { status: PurchaseOrderStatus.RECEIVED },
    });

    return grn;
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

  /** Auto-deduct ingredients when order moves to PREPARING */
  async deductForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const alreadyDeducted = await this.prisma.inventoryConsumption.count({ where: { orderId } });
    if (alreadyDeducted > 0) return;

    for (const orderItem of order.items) {
      const recipe = await this.prisma.recipe.findUnique({
        where: { productId: orderItem.productId },
        include: { items: true },
      });
      if (!recipe) continue;

      for (const ri of recipe.items) {
        const deductQty = this.num(ri.quantity) * orderItem.quantity;
        const item = await this.prisma.inventoryItem.findUnique({ where: { id: ri.itemId } });
        if (!item) continue;

        const before = this.num(item.currentStock);
        const after = Math.max(0, before - deductQty);

        await this.prisma.inventoryItem.update({
          where: { id: ri.itemId },
          data: { currentStock: after },
        });

        await this.recordMovement(
          ri.itemId,
          StockMovementType.CONSUMPTION,
          deductQty,
          before,
          after,
          'Order preparation',
          order.orderNumber,
        );

        await this.prisma.inventoryConsumption.create({
          data: { orderId, itemId: ri.itemId, quantity: deductQty },
        });

        await this.refreshItemStatus(ri.itemId);
      }
    }
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
    return { wastes, totalLoss };
  }
}
