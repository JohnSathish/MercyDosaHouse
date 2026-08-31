import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { Public, RequirePermissions } from '../../common/guards';
import { orderChannelOf, type ChannelRequest } from '../../common/app-channel.interceptor';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @ApiBearerAuth()
  @RequirePermissions('coupons.read')
  @Get('admin/app-performance')
  appPerformance() {
    return this.couponsService.appPerformance();
  }

  @ApiBearerAuth()
  @RequirePermissions('coupons.read')
  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Public()
  @Post('validate')
  async validate(
    @Body()
    body: {
      code: string;
      subtotal: number;
      items?: { productId: string; categoryId?: string; totalPrice: number }[];
    },
    @Req() req: { user?: { id?: string; sub?: string }; orderChannel?: 'WEBSITE' | 'ANDROID' },
  ) {
    const result = await this.couponsService.calculate(
      body.code,
      body.subtotal,
      body.items ?? [],
      req.user?.id ?? req.user?.sub,
      orderChannelOf(req),
    );
    if (!result) throw new BadRequestException('Discount not found');
    return {
      discount: result.amount,
      discountAmount: result.amount,
      coupon: {
        id: result.discount.id,
        name: result.discount.name,
        code: result.discount.code,
        type: result.discount.type,
        value: Number(result.discount.value),
      },
    };
  }

  @Public()
  @Get('available')
  available(
    @Query('subtotal') subtotal?: string,
    @Query('productIds') productIds?: string,
    @Query('items') items?: string,
    @Req() req?: ChannelRequest & { user?: { id?: string; sub?: string } },
  ) {
    let cartItems: { productId: string; variantId?: string; quantity: number }[] = [];
    try {
      const parsed = items ? JSON.parse(items) : [];
      if (Array.isArray(parsed)) cartItems = parsed;
    } catch {
      cartItems = [];
    }
    return this.couponsService.getAvailable(
      parseFloat(subtotal || '0'),
      productIds?.split(',').filter(Boolean) ?? [],
      req?.user?.id ?? req?.user?.sub,
      cartItems,
      orderChannelOf(req),
    );
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

  @ApiBearerAuth()
  @RequirePermissions('coupons.write')
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.couponsService.duplicate(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('coupons.write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
