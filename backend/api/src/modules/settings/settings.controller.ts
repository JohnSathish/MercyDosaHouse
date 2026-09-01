import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';
import { EmailService } from '../notifications/email.service';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';
import { OrderNotificationRecipientsService } from '../notifications/order-notification-recipients.service';
import * as crypto from 'crypto';

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

  @ApiBearerAuth()
  @RequirePermissions('settings.read')
  @Get('auth')
  async getAuthConfig() {
    const config = await this.settingsService.getAuthConfig();
    return {
      ...config,
      emailStatus: this.emailService.getStatus(),
    };
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('auth')
  updateAuthConfig(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateAuthConfig(body);
  }

  @Public()
  @Get('feedback')
  getFeedbackConfig() {
    return this.settingsService.getFeedbackConfig();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('feedback')
  updateFeedbackConfig(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateFeedbackConfig(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.read')
  @Get('invoice')
  getInvoiceConfig() {
    return this.settingsService.getInvoiceConfig();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('invoice')
  updateInvoiceConfig(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateInvoiceConfig(body);
  }

  @Public()
  @Get('app-promo')
  getAppPromo() {
    return this.settingsService.getAppPromoConfig();
  }

  @Public()
  @Get('seo-config')
  getSeoConfig() {
    return this.settingsService.getSeoConfig();
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('seo-config')
  updateSeoConfig(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateSeoConfig(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch('app-promo')
  updateAppPromo(@Body() body: Record<string, unknown>) {
    return this.settingsService.updateAppPromoConfig(body);
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
  async sendTestEmail(@Body() body: { to?: string; kind?: 'generic' | 'login-otp' }) {
    const to = body.to?.trim();
    if (body.kind === 'login-otp') {
      if (!to) {
        return { sent: false, error: 'Enter a recipient email for the OTP template test.' };
      }
      const assets = await this.settingsService.getLoginEmailAssets();
      const otp = String(crypto.randomInt(100000, 1000000));
      const result = await this.emailService.sendCustomerLoginOtp({
        to,
        otp,
        expiryMinutes: Math.max(1, Math.round(assets.cfg.otpExpirySeconds / 60)),
        customerName: null,
        websiteUrl: assets.websiteUrl,
        logoUrl: assets.logoUrl,
        senderName: assets.cfg.senderName,
        senderEmail: assets.cfg.senderEmail,
      });
      return { sent: result.sent, error: result.error, provider: result.provider };
    }

    const active = await this.orderEmailNotification.getRecipients();
    const recipient = to || active[0];
    if (!recipient) {
      return {
        sent: false,
        error: 'No active notification email — add one under Order Notification Emails',
      };
    }
    return this.emailService.send({
      to: recipient,
      subject: 'Mercy Dosa House — test order notification email',
      text: 'This is a test email from Mercy Dosa House. Order notification emails are working.',
      html: '<p>This is a <strong>test email</strong> from Mercy Dosa House.</p><p>Order notification emails are working.</p>',
    });
  }
}
