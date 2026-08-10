import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  InventoryItemStatus,
  PurchaseOrderStatus,
  StockAdjustmentReason,
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
  ) {
    return this.inventoryService.listItems({
      search,
      categoryId,
      status,
      lowStock: lowStock === 'true',
    });
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
      currentStock?: number;
      minStock?: number;
      maxStock?: number;
      costPrice?: number;
      supplierId?: string;
      locationId?: string;
      expiryTracking?: boolean;
    },
  ) {
    return this.inventoryService.createItem({
      name: body.name,
      sku: body.sku,
      barcode: body.barcode,
      unit: body.unit,
      currentStock: body.currentStock ?? 0,
      minStock: body.minStock ?? 0,
      maxStock: body.maxStock ?? 0,
      costPrice: body.costPrice ?? 0,
      averageCost: body.costPrice ?? 0,
      expiryTracking: body.expiryTracking ?? false,
      category: { connect: { id: body.categoryId } },
      ...(body.supplierId ? { supplier: { connect: { id: body.supplierId } } } : {}),
      ...(body.locationId ? { location: { connect: { id: body.locationId } } } : {}),
    });
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.write')
  updateItem(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.inventoryService.updateItem(id, body as never);
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
  listSuppliers() {
    return this.inventoryService.listSuppliers();
  }

  @Post('suppliers')
  @RequirePermissions('inventory.write')
  createSupplier(
    @Body()
    body: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      gstNumber?: string;
      address?: string;
      paymentTerms?: string;
    },
  ) {
    return this.inventoryService.createSupplier(body);
  }

  @Get('purchase-orders')
  @RequirePermissions('inventory.read')
  listPurchaseOrders() {
    return this.inventoryService.listPurchaseOrders();
  }

  @Post('purchase-orders')
  @RequirePermissions('inventory.write')
  createPurchaseOrder(
    @Body()
    body: {
      supplierId: string;
      items: Array<{ itemId: string; quantity: number; rate: number; tax?: number }>;
      notes?: string;
    },
  ) {
    return this.inventoryService.createPurchaseOrder(body);
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
        acceptedQty: number;
        rejectedQty?: number;
      }>;
    },
  ) {
    return this.inventoryService.receiveGRN(body);
  }

  @Get('recipes')
  @RequirePermissions('inventory.read')
  listRecipes() {
    return this.inventoryService.listRecipes();
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

  @Get('waste')
  @RequirePermissions('inventory.read')
  getWasteReport(@Query('days') days?: string) {
    return this.inventoryService.getWasteReport(days ? parseInt(days, 10) : 30);
  }
}
