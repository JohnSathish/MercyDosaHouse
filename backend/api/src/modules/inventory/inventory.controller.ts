import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  InventoryItemStatus,
  PurchaseOrderStatus,
  StockAdjustmentReason,
  StockMovementType,
  WasteReason,
  InventoryUnit,
} from '@prisma/client';
import { InventoryService } from './inventory.service';
import { RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('dashboard')
  @RequirePermissions('inventory.read')
  getDashboard() {
    return this.inventoryService.getDashboard();
  }

  @Get('items')
  @RequirePermissions('inventory.read')
  listItems(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: InventoryItemStatus,
    @Query('lowStock') lowStock?: string,
    @Query('supplierId') supplierId?: string,
    @Query('locationId') locationId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.inventoryService.listItems({
      search,
      categoryId,
      status,
      lowStock: lowStock === 'true',
      supplierId,
      locationId,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('items/barcode/:code')
  @RequirePermissions('inventory.read')
  findByBarcode(@Param('code') code: string) {
    return this.inventoryService.findByBarcode(code);
  }

  @Get('items/:id')
  @RequirePermissions('inventory.read')
  getItem(@Param('id') id: string) {
    return this.inventoryService.getItem(id);
  }

  @Post('items')
  @RequirePermissions('inventory.write')
  createItem(
    @Body()
    body: {
      name: string;
      sku: string;
      barcode?: string;
      categoryId: string;
      unit: InventoryUnit;
      customUnit?: string;
      currentStock?: number;
      minStock?: number;
      maxStock?: number;
      costPrice?: number;
      supplierId?: string;
      locationId?: string;
      expiryTracking?: boolean;
      lotNumber?: string;
      expiryDate?: string;
      notes?: string;
    },
  ) {
    return this.inventoryService.createItem({
      name: body.name,
      sku: body.sku,
      barcode: body.barcode,
      unit: body.unit,
      customUnit: body.customUnit,
      currentStock: body.currentStock ?? 0,
      minStock: body.minStock ?? 0,
      maxStock: body.maxStock ?? 0,
      costPrice: body.costPrice ?? 0,
      averageCost: body.costPrice ?? 0,
      expiryTracking: body.expiryTracking ?? Boolean(body.expiryDate),
      lotNumber: body.lotNumber,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      notes: body.notes,
      category: { connect: { id: body.categoryId } },
      ...(body.supplierId ? { supplier: { connect: { id: body.supplierId } } } : {}),
      ...(body.locationId ? { location: { connect: { id: body.locationId } } } : {}),
    });
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.write')
  updateItem(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.inventoryService.updateItem(id, body);
  }

  @Post('items/:id/deactivate')
  @RequirePermissions('inventory.write')
  deactivateItem(@Param('id') id: string) {
    return this.inventoryService.setItemActive(id, false);
  }

  @Post('items/:id/activate')
  @RequirePermissions('inventory.write')
  activateItem(@Param('id') id: string) {
    return this.inventoryService.setItemActive(id, true);
  }

  @Post('items/:id/adjust')
  @RequirePermissions('inventory.write')
  adjustStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; reason: StockAdjustmentReason; notes?: string },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.inventoryService.adjustStock(
      id,
      body.quantity,
      body.reason,
      body.notes,
      req.user?.sub,
    );
  }

  @Post('items/:id/waste')
  @RequirePermissions('inventory.write')
  recordWaste(
    @Param('id') id: string,
    @Body() body: { quantity: number; reason: WasteReason; notes?: string },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.inventoryService.recordWaste(
      id,
      body.quantity,
      body.reason,
      body.notes,
      req.user?.sub,
    );
  }

  @Get('movements')
  @RequirePermissions('inventory.read')
  listMovements(
    @Query('itemId') itemId?: string,
    @Query('type') type?: StockMovementType,
    @Query('reference') reference?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.inventoryService.listMovements({ itemId, type, reference, from, to });
  }

  @Get('categories')
  @RequirePermissions('inventory.read')
  listCategories() {
    return this.inventoryService.listCategories();
  }

  @Get('locations')
  @RequirePermissions('inventory.read')
  listLocations() {
    return this.inventoryService.listLocations();
  }

  @Get('suppliers')
  @RequirePermissions('inventory.read')
  listSuppliers(@Query('includeInactive') includeInactive?: string) {
    return this.inventoryService.listSuppliers(includeInactive === 'true');
  }

  @Get('suppliers/:id')
  @RequirePermissions('inventory.read')
  getSupplier(@Param('id') id: string) {
    return this.inventoryService.getSupplier(id);
  }

  @Post('suppliers')
  @RequirePermissions('inventory.write')
  createSupplier(
    @Body()
    body: {
      name: string;
      contactPerson?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      gstNumber?: string;
      address?: string;
      paymentTerms?: string;
      bankName?: string;
      accountNumber?: string;
      ifsc?: string;
      notes?: string;
    },
  ) {
    return this.inventoryService.createSupplier(body);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('inventory.write')
  updateSupplier(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.inventoryService.updateSupplier(id, body);
  }

  @Post('suppliers/:id/deactivate')
  @RequirePermissions('inventory.write')
  deactivateSupplier(@Param('id') id: string) {
    return this.inventoryService.setSupplierActive(id, false);
  }

  @Get('purchase-orders')
  @RequirePermissions('inventory.read')
  listPurchaseOrders() {
    return this.inventoryService.listPurchaseOrders();
  }

  @Get('purchase-orders/:id/pdf')
  @RequirePermissions('inventory.read')
  async poPdf(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const { buffer, filename } = await this.inventoryService.generatePurchaseOrderPdf(id);
      const disposition = download === '0' ? 'inline' : 'attachment';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      res.setHeader('Content-Length', String(buffer.length));
      res.end(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate purchase order PDF';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('inventory.read')
  getPurchaseOrder(@Param('id') id: string) {
    return this.inventoryService.getPurchaseOrder(id);
  }

  @Post('purchase-orders')
  @RequirePermissions('inventory.write')
  createPurchaseOrder(
    @Body()
    body: {
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
    },
    @Req() req: { user?: RequestUser },
  ) {
    return this.inventoryService.createPurchaseOrder({
      ...body,
      createdById: req.user?.id,
    });
  }

  @Patch('purchase-orders/:id')
  @RequirePermissions('inventory.write')
  updatePurchaseOrder(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.inventoryService.updateDraftPurchaseOrder(id, body);
  }

  @Post('purchase-orders/:id/duplicate')
  @RequirePermissions('inventory.write')
  duplicatePo(@Param('id') id: string, @Req() req: { user?: RequestUser }) {
    return this.inventoryService.duplicatePurchaseOrder(id, req.user?.id);
  }

  @Patch('purchase-orders/:id/status')
  @RequirePermissions('inventory.write')
  updatePOStatus(@Param('id') id: string, @Body() body: { status: PurchaseOrderStatus }) {
    return this.inventoryService.updatePurchaseOrderStatus(id, body.status);
  }

  @Post('grn')
  @RequirePermissions('inventory.write')
  receiveGRN(
    @Body()
    body: {
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
    @Req() req: { user?: RequestUser },
  ) {
    return this.inventoryService.receiveGRN(body, req.user?.id);
  }

  @Get('recipes')
  @RequirePermissions('inventory.read')
  listRecipes() {
    return this.inventoryService.listRecipes();
  }

  @Get('menu-availability')
  @RequirePermissions('inventory.read')
  menuAvailability() {
    return this.inventoryService.getMenuAvailability();
  }

  @Post('recipes')
  @RequirePermissions('inventory.write')
  createRecipe(
    @Body()
    body: {
      productId: string;
      name: string;
      items: Array<{ itemId: string; quantity: number; unit: InventoryUnit }>;
    },
  ) {
    return this.inventoryService.createRecipe(body);
  }

  @Get('expiring')
  @RequirePermissions('inventory.read')
  getExpiring(@Query('days') days?: string) {
    return this.inventoryService.getExpiringBatches(days ? parseInt(days, 10) : 7);
  }

  @Get('expiry-buckets')
  @RequirePermissions('inventory.read')
  expiryBuckets() {
    return this.inventoryService.listExpiryBuckets();
  }

  @Get('waste')
  @RequirePermissions('inventory.read')
  getWasteReport(@Query('days') days?: string) {
    return this.inventoryService.getWasteReport(days ? parseInt(days, 10) : 30);
  }

  @Get('reports')
  @RequirePermissions('inventory.read')
  reports(@Query('type') type?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.inventoryService.getReports({ type, from, to });
  }
}
