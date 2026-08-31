import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  @Public()
  @Get('config')
  publicConfig() {
    return this.loyalty.publicConfig();
  }

  @ApiBearerAuth()
  @Get('me')
  me(@Req() req: { user: RequestUser }) {
    return this.loyalty.me(req.user.id);
  }

  @ApiBearerAuth()
  @Get('me/transactions')
  myHistory(
    @Req() req: { user: RequestUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.loyalty.history(req.user.id, page ? Number(page) : 1, limit ? Number(limit) : 30);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.read')
  @Get('admin/settings')
  adminSettings() {
    return this.loyalty.getConfig();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('admin/settings')
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.loyalty.updateConfig(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('users.read')
  @Get('admin/dashboard')
  dashboard() {
    return this.loyalty.dashboard();
  }

  @ApiBearerAuth()
  @RequirePermissions('users.read')
  @Get('admin/customers/:id/transactions')
  adminHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.loyalty.history(id, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @ApiBearerAuth()
  @RequirePermissions('users.write')
  @Post('admin/customers/:id/adjust')
  adjust(
    @Param('id') id: string,
    @Body() body: { action?: 'add' | 'deduct'; coins?: number; reason?: string },
    @Req() req: { user: RequestUser },
  ) {
    const coins = Math.floor(Number(body.coins) || 0);
    const signed = body.action === 'deduct' ? -Math.abs(coins) : Math.abs(coins);
    return this.loyalty.adjust(id, signed, body.reason || '', req.user.id);
  }
}
