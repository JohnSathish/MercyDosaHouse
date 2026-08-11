import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';
import { EmailService } from '../notifications/email.service';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';
import { OrderNotificationRecipientsService } from '../notifications/order-notification-recipients.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private emailService: EmailService,
    private orderEmailNotification: OrderEmailNotificationService,
    private orderNotificationRecipients: OrderNotificationRecipientsService,
  ) {}

  @Public()
  @Get('restaurant-status')
  getRestaurantStatus() {
    return this.settingsService.getRestaurantStatus();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('restaurant-status')
  updateRestaurantStatus(
    @Body()
    body: {
      storeOpen: boolean;
      storeClosedMessage?: string | null;
      storeReopenMessage?: string | null;
      storeClosedReason?: string | null;
      operatingSchedule?: Record<string, unknown> | null;
    },
    @Req() req: { user: RequestUser },
  ) {
    return this.settingsService.updateRestaurantStatus(body, req.user.id);
  }

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

  @ApiBearerAuth()
  @RequirePermissions('settings.read')
  @Get('email/status')
  async getEmailStatus() {
    return {
      ...this.emailService.getStatus(),
      recipients: await this.orderEmailNotification.getRecipients(),
    };
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.read')
  @Get('order-notification-emails')
  listOrderNotificationEmails() {
    return this.orderNotificationRecipients.listAll();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Post('order-notification-emails')
  createOrderNotificationEmail(@Body() body: { email: string }, @Req() req: { user: RequestUser }) {
    return this.orderNotificationRecipients.create(body.email, req.user.id);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('order-notification-emails/:id')
  updateOrderNotificationEmail(
    @Param('id') id: string,
    @Body() body: { email?: string; isActive?: boolean },
  ) {
    return this.orderNotificationRecipients.update(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Delete('order-notification-emails/:id')
  async deleteOrderNotificationEmail(@Param('id') id: string) {
    await this.orderNotificationRecipients.remove(id);
    return { ok: true };
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Post('email/test')
  async sendTestEmail(@Body() body: { to?: string }) {
    const active = await this.orderEmailNotification.getRecipients();
    const to = body.to?.trim() || active[0];
    if (!to) {
      return {
        sent: false,
        error: 'No active notification email — add one under Order Notification Emails',
      };
    }
    return this.emailService.send({
      to,
      subject: 'Mercy Dosa House — test order notification email',
      text: 'This is a test email from Mercy Dosa House. Order notification emails are working.',
      html: '<p>This is a <strong>test email</strong> from Mercy Dosa House.</p><p>Order notification emails are working.</p>',
    });
  }
}
