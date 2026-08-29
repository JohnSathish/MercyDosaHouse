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
  checkDelivery(
    @Query('address') address = '',
    @Query('pincode') pincode?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    return this.marketingService.checkDeliveryArea(address, pincode, {
      latitude: latitude == null ? undefined : Number(latitude),
      longitude: longitude == null ? undefined : Number(longitude),
    });
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
  @Get('popups')
  listPopups(@Query('all') all?: string) {
    return this.marketingService.listPopups(all !== 'false');
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('popups/:id/analytics')
  getPopupAnalytics(@Param('id') id: string) {
    return this.marketingService.getPopupAnalytics(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('popups/:id/toggle')
  togglePopup(@Param('id') id: string, @Body() body: { isActive?: boolean }) {
    return this.marketingService.togglePopup(id, body.isActive);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('popups/:id')
  getPopup(@Param('id') id: string) {
    return this.marketingService.getAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('announcements')
  listAnnouncements(@Query('all') all?: string, @Query('type') type?: 'BAR' | 'POPUP') {
    return this.marketingService.listAnnouncements(
      all === 'true',
      type === 'POPUP' ? 'POPUP' : type === 'BAR' ? 'BAR' : undefined,
    );
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('announcements/:id')
  getAnnouncement(@Param('id') id: string) {
    return this.marketingService.getAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('popups')
  createPopup(@Body() body: Record<string, unknown>) {
    return this.marketingService.createAnnouncement({ ...body, type: 'POPUP' } as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('popups/:id')
  updatePopup(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.marketingService.updateAnnouncement(id, { ...body, type: 'POPUP' });
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('popups/:id')
  deletePopup(@Param('id') id: string) {
    return this.marketingService.deleteAnnouncement(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('popups/:id/duplicate')
  duplicatePopup(@Param('id') id: string) {
    return this.marketingService.duplicateAnnouncement(id);
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
