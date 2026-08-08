import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Public()
  @Get('business')
  getBusinessSettings() {
    return this.settingsService.getBusinessSettings();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('business')
  updateBusinessSettings(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateBusinessSettings(body);
  }

  @Public()
  @Get('banners')
  getBanners(@Query('all') all?: string) {
    return this.settingsService.getBanners(all !== 'true');
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Post('banners')
  createBanner(@Body() body: Record<string, unknown>) {
    return this.settingsService.createBanner(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('banners/:id')
  updateBanner(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateBanner(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.settingsService.deleteBanner(id);
  }

  @Public()
  @Get('payment-methods')
  getPaymentMethods() {
    return this.settingsService.getPaymentMethods();
  }

  @Public()
  @Get('delivery-check')
  checkDelivery(@Query('pincode') pincode: string) {
    return this.settingsService.checkDeliveryPincode(pincode ?? '');
  }
}
