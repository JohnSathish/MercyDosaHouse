import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService, ReportFilters } from './reports.service';
import { RequirePermissions } from '../../common/guards';

@ApiTags('reports')
@ApiBearerAuth()
@RequirePermissions('reports.read')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  private parseFilters(
    period?: string,
    startDate?: string,
    endDate?: string,
    paymentMethod?: string,
    status?: string,
  ): ReportFilters {
    return {
      period: (period as ReportFilters['period']) ?? 'today',
      startDate,
      endDate,
      paymentMethod,
      status,
    };
  }

  @Get('dashboard')
  getDashboard(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getExecutiveDashboard(
      this.parseFilters(period, startDate, endDate, paymentMethod, status),
    );
  }

  @Get('sales')
  getSales(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesAnalytics(this.parseFilters(period, startDate, endDate));
  }

  @Get('orders')
  getOrders(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getOrderAnalytics(this.parseFilters(period, startDate, endDate));
  }

  @Get('products')
  getProducts(@Query('limit') limit?: string) {
    return this.reportsService.getProductPerformance(limit ? parseInt(limit) : 20);
  }

  @Get('categories')
  getCategories() {
    return this.reportsService.getCategoryAnalytics();
  }

  @Get('customers')
  getCustomers() {
    return this.reportsService.getCustomerAnalytics();
  }

  @Get('payments')
  getPayments(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPaymentAnalytics(this.parseFilters(period, startDate, endDate));
  }

  @Get('delivery')
  getDelivery() {
    return this.reportsService.getDeliveryAnalytics();
  }

  @Get('kitchen')
  getKitchen() {
    return this.reportsService.getKitchenAnalytics();
  }

  @Get('inventory')
  getInventory() {
    return this.reportsService.getInventoryAnalytics();
  }

  @Get('insights')
  getInsights() {
    return this.reportsService.getInsights();
  }

  @Get('heatmap')
  getHeatmap() {
    return this.reportsService.getHeatmap();
  }

  @Get('export')
  export(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService
      .exportSummary(this.parseFilters(period, startDate, endDate))
      .then((csv) => ({ csv, filename: 'business-report.csv' }));
  }

  @Get('daily')
  dailySales(@Query('date') date?: string) {
    return this.reportsService.dailySales(date);
  }

  @Get('monthly')
  monthlySales(@Query('year') year: string, @Query('month') month: string) {
    return this.reportsService.monthlySales(parseInt(year), parseInt(month));
  }

  @Get('top-products')
  topProducts(@Query('limit') limit?: string) {
    return this.reportsService.topProducts(limit ? parseInt(limit) : 10);
  }

  @Get('cancelled')
  cancelledOrders() {
    return this.reportsService.cancelledOrders();
  }
}
