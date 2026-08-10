import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @ApiBearerAuth()
  @RequirePermissions('coupons.read')
  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Public()
  @Post('validate')
  validate(@Body() body: { code: string; subtotal: number }) {
    return this.couponsService.validate(body.code, body.subtotal);
  }

  @Public()
  @Get('available')
  available(@Query('subtotal') subtotal?: string) {
    return this.couponsService.getAvailable(parseFloat(subtotal || '0'));
  }

  @ApiBearerAuth()
  @RequirePermissions('coupons.write')
  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.couponsService.create(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('coupons.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.couponsService.update(id, body);
  }
}
