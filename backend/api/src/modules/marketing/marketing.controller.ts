import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../../common/guards';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private marketingService: MarketingService) {}

  @Public()
  @Get('public')
  getPublic(@Query('platform') platform?: 'WEBSITE' | 'ANDROID') {
    return this.marketingService.getPublicBundle(platform === 'ANDROID' ? 'ANDROID' : 'WEBSITE');
  }

  @Public()
  @Get('delivery/check')
  checkDelivery(@Query('address') address = '', @Query('pincode') pincode?: string) {
    return this.marketingService.checkDeliveryArea(address, pincode);
  }

  @Public()
  @Post('analytics/track')
  trackEvent(@Body() body: Record<string, unknown>) {
    return this.marketingService.trackEvent(body as never);
  }

  @Public()
  @Post('dismissals')
  recordDismissal(@Body() body: Record<string, unknown>) {
    return this.marketingService.recordDismissal(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('dashboard')
  getDashboard() {
    return this.marketingService.getDashboard();
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('announcements')
  listAnnouncements(@Query('all') all?: string) {
    return this.marketingService.listAnnouncements(all === 'true');
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('announcements/:id')
  getAnnouncement(@Param('id') id: string) {
    return this.marketingService.getAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('announcements')
  createAnnouncement(@Body() body: Record<string, unknown>) {
    return this.marketingService.createAnnouncement(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('announcements/:id')
  updateAnnouncement(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.marketingService.updateAnnouncement(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.marketingService.deleteAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('announcements/:id/duplicate')
  duplicateAnnouncement(@Param('id') id: string) {
    return this.marketingService.duplicateAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('announcements/:id/publish')
  publishAnnouncement(@Param('id') id: string) {
    return this.marketingService.publishAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('delivery-config')
  getDeliveryConfigAdmin() {
    return this.marketingService.getDeliveryConfigPublic();
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('delivery-config')
  upsertDeliveryConfig(@Body() body: Record<string, unknown>) {
    return this.marketingService.upsertDeliveryConfig(body);
  }
}
