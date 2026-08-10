import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  OrderType,
  PaymentMethod,
  PosBillStatus,
  PosDiscountType,
  PosTableStatus,
} from '@prisma/client';
import { PosService } from './pos.service';
import { RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('pos')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private posService: PosService) {}

  @Get('menu')
  @RequirePermissions('pos.read')
  getMenu(@Query('search') search?: string) {
    return this.posService.getMenu(search);
  }

  @Get('floors')
  @RequirePermissions('pos.read')
  getFloors() {
    return this.posService.getFloors();
  }

  @Get('tables')
  @RequirePermissions('pos.read')
  getTables(@Query('floorId') floorId?: string) {
    return this.posService.getTables(floorId);
  }

  @Patch('tables/:id/status')
  @RequirePermissions('pos.manage')
  updateTableStatus(@Param('id') id: string, @Body() body: { status: PosTableStatus }) {
    return this.posService.updateTableStatus(id, body.status);
  }

  @Post('tables/merge')
  @RequirePermissions('pos.manage')
  mergeTables(@Body() body: { tableIds: string[]; targetTableId: string }) {
    return this.posService.mergeTables(body.tableIds, body.targetTableId);
  }

  @Post('tables/transfer')
  @RequirePermissions('pos.manage')
  transferTable(@Body() body: { fromTableId: string; toTableId: string }) {
    return this.posService.transferTable(body.fromTableId, body.toTableId);
  }

  @Post('bills')
  @RequirePermissions('pos.manage')
  createBill(
    @Body()
    body: {
      orderType: OrderType;
      tableId?: string;
      customerName?: string;
      customerPhone?: string;
      customerId?: string;
      deliveryAddress?: string;
      covers?: number;
    },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.createBill(body, req.user!.id);
  }

  @Get('bills')
  @RequirePermissions('pos.read')
  listBills(
    @Query('status') status?: PosBillStatus,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.posService.listBills({
      status,
      sessionId,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get('bills/:id')
  @RequirePermissions('pos.read')
  getBill(@Param('id') id: string) {
    return this.posService.getBill(id);
  }

  @Patch('bills/:id')
  @RequirePermissions('pos.manage')
  updateBill(
    @Param('id') id: string,
    @Body()
    body: {
      customerName?: string;
      customerPhone?: string;
      customerId?: string | null;
      covers?: number;
      orderType?: OrderType;
      deliveryAddress?: string | null;
      tableId?: string | null;
    },
  ) {
    return this.posService.updateBillDetails(id, body);
  }

  @Post('bills/:id/items')
  @RequirePermissions('pos.manage')
  addItem(
    @Param('id') id: string,
    @Body()
    body: {
      productId: string;
      variantId?: string;
      quantity?: number;
      specialInstructions?: string;
    },
  ) {
    return this.posService.addItem(id, body);
  }

  @Patch('bills/:id/items/:itemId')
  @RequirePermissions('pos.manage')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { quantity?: number; specialInstructions?: string },
  ) {
    return this.posService.updateItem(id, itemId, body);
  }

  @Delete('bills/:id/items/:itemId')
  @RequirePermissions('pos.manage')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.posService.removeItem(id, itemId);
  }

  @Post('bills/:id/kitchen')
  @RequirePermissions('pos.manage')
  fireKitchen(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.posService.fireKitchen(id, req.user!.id);
  }

  @Post('bills/:id/hold')
  @RequirePermissions('pos.manage')
  holdBill(@Param('id') id: string, @Body() body: { label?: string }) {
    return this.posService.holdBill(id, body.label);
  }

  @Post('bills/:id/resume')
  @RequirePermissions('pos.manage')
  resumeBill(@Param('id') id: string) {
    return this.posService.resumeBill(id);
  }

  @Get('hold-bills')
  @RequirePermissions('pos.read')
  getHoldBills(@Query('sessionId') sessionId?: string) {
    return this.posService.getHoldBills(sessionId);
  }

  @Post('bills/:id/discount')
  @RequirePermissions('pos.discount')
  applyDiscount(
    @Param('id') id: string,
    @Body()
    body: { type: PosDiscountType; amount: number; reason?: string; managerPin?: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.applyDiscount(id, body, req.user!.id);
  }

  @Post('bills/:id/settle')
  @RequirePermissions('pos.manage')
  settleBill(
    @Param('id') id: string,
    @Body()
    body: {
      paymentMethod: PaymentMethod;
      paymentLines?: { method: PaymentMethod; amount: number; reference?: string }[];
    },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.settleBill(id, body, req.user!.id);
  }

  @Post('bills/:id/void')
  @RequirePermissions('pos.void')
  voidBill(
    @Param('id') id: string,
    @Body() body: { reason: string; managerPin?: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.voidBill(id, body.reason, req.user!.id, body.managerPin);
  }

  @Post('bills/:id/refund')
  @RequirePermissions('pos.refund')
  refundBill(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string; managerPin?: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.refundBill(id, body, req.user!.id);
  }

  @Post('bills/:id/reorder')
  @RequirePermissions('pos.manage')
  reorder(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.posService.reorderFromBill(id, req.user!.id);
  }

  @Get('customers/:id/addresses')
  @RequirePermissions('pos.read')
  getCustomerAddresses(@Param('id') id: string) {
    return this.posService.getCustomerAddresses(id);
  }

  @Get('customers/search')
  @RequirePermissions('pos.read')
  searchCustomers(@Query('q') q: string) {
    return this.posService.searchCustomers(q ?? '');
  }

  @Get('analytics/live')
  @RequirePermissions('pos.read')
  liveAnalytics() {
    return this.posService.getLiveAnalytics();
  }

  @Get('sessions/current')
  @RequirePermissions('pos.read')
  getCurrentSession(@Req() req: { user: RequestUser }) {
    return this.posService.getCurrentSession(req.user!.id);
  }

  @Post('sessions/open')
  @RequirePermissions('pos.shift')
  openSession(
    @Body() body: { openingFloat?: number; terminalId?: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.openSession(req.user!.id, body.openingFloat ?? 0, body.terminalId);
  }

  @Post('sessions/:id/close')
  @RequirePermissions('pos.shift')
  closeSession(
    @Param('id') id: string,
    @Body() body: { closingCash: number },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.closeSession(id, body.closingCash, req.user!.id);
  }

  @Post('sessions/:id/cash')
  @RequirePermissions('pos.shift')
  cashTransaction(
    @Param('id') id: string,
    @Body() body: { type: 'IN' | 'OUT'; amount: number; reason: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.cashTransaction(id, body.type, body.amount, body.reason, req.user!.id);
  }

  @Post('offline/sync')
  @RequirePermissions('pos.manage')
  syncOffline(
    @Body()
    body: {
      terminalId: string;
      bills: {
        localId: string;
        orderType: OrderType;
        customerName?: string;
        customerPhone?: string;
        items: { productId: string; variantId?: string; quantity: number }[];
      }[];
    },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.syncOfflineQueue(body.terminalId, body.bills, req.user!.id);
  }

  @Get('reports')
  @RequirePermissions('reports.read')
  getReports(@Query('period') period?: 'today' | 'week' | 'month') {
    return this.posService.getPosReports(period ?? 'today');
  }

  @Post('security/log')
  @RequirePermissions('pos.read')
  logSecurity(
    @Body() body: { action: string; metadata?: Record<string, unknown> },
    @Req() req: { user: RequestUser },
  ) {
    return this.posService.logSecurityEvent(req.user!.id, body.action, body.metadata);
  }

  @Post('security/verify-pin')
  @RequirePermissions('pos.read')
  verifyManagerPin(@Body() body: { pin: string }) {
    return this.posService.verifyManagerPinPublic(body.pin);
  }
}
