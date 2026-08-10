import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public, RequirePermissions } from '../../common/guards';
import { EmailService } from '../notifications/email.service';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private emailService: EmailService,
    private orderEmailNotification: OrderEmailNotificationService,
  ) {}

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
  getEmailStatus() {
    return {
      ...this.emailService.getStatus(),
      recipients: this.orderEmailNotification.getRecipients(),
    };
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Post('email/test')
  async sendTestEmail(@Body() body: { to?: string }) {
    const to = body.to?.trim() || this.orderEmailNotification.getRecipients()[0];
    if (!to) {
      return {
        sent: false,
        error: 'No recipient — set ORDER_NOTIFICATION_RECIPIENTS or pass { to }',
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
