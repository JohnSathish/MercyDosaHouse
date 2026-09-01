import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { NotificationPreferenceDto } from '@mdh/types';
import { NotificationsService, type StaffPushConfig } from './notifications.service';
import { RequestUser, RequirePermissions } from '../../common/guards';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('inbox')
  getInbox(
    @Req() req: { user: RequestUser },
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('read') read?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.listInbox(req.user.id, {
      category,
      type,
      read,
      q,
      from,
      to,
      page,
      limit,
    });
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: { user: RequestUser }) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  @Get('preferences')
  getPreferences(@Req() req: { user: RequestUser }) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: { user: RequestUser },
    @Body() body: Partial<NotificationPreferenceDto>,
  ) {
    return this.notificationsService.updatePreferences(req.user.id, body);
  }

  @Get()
  getNotifications(@Req() req: { user: RequestUser }) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Get('staff-push-config')
  getStaffPushConfig() {
    return this.notificationsService.getStaffPushConfig();
  }

  @RequirePermissions('settings.read')
  @Get('diagnostics')
  getPushDiagnostics() {
    return this.notificationsService.getPushDiagnostics();
  }

  @RequirePermissions('settings.read')
  @Get('order-dispatches')
  getOrderDispatches() {
    return this.notificationsService.getOrderNotificationLogs();
  }

  @RequirePermissions('settings.write')
  @Post('order-dispatches/:id/retry')
  retryOrderDispatch(@Param('id') id: string) {
    return this.notificationsService.retryOrderNotification(id);
  }

  @RequirePermissions('settings.read')
  @Get('config')
  getNotificationConfig() {
    return this.notificationsService.getNotificationConfig();
  }

  @RequirePermissions('settings.write')
  @Patch('config')
  updateNotificationConfig(@Body() body: Record<string, unknown>) {
    return this.notificationsService.updateNotificationConfig(body);
  }

  @RequirePermissions('settings.write')
  @Patch('staff-push-config')
  updateStaffPushConfig(@Body() body: Partial<StaffPushConfig>) {
    return this.notificationsService.updateStaffPushConfig(body);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Post('read-all')
  markAllRead(@Req() req: { user: RequestUser }) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Post('read-by-order')
  markReadByOrder(@Req() req: { user: RequestUser }, @Body() body: { orderId: string }) {
    return this.notificationsService.markReadByOrderId(body.orderId, req.user.id);
  }

  @Post('device-token')
  registerDevice(
    @Req() req: { user: RequestUser },
    @Body() body: { token: string; platform: string },
  ) {
    return this.notificationsService.registerDevice(req.user.id, body.token, body.platform);
  }

  @Post('device-token/remove')
  unregisterDevice(@Req() req: { user: RequestUser }, @Body() body: { token: string }) {
    return this.notificationsService.unregisterDevice(req.user.id, body.token);
  }

  @Post('test-push')
  testPush(@Req() req: { user: RequestUser }) {
    return this.notificationsService.sendTestPushToUser(req.user.id);
  }
}
