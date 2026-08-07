import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../../common/guards';

@ApiTags('reports')
@ApiBearerAuth()
@RequirePermissions('reports.read')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

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
