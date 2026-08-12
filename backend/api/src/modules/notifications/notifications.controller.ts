import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService, type StaffPushConfig } from './notifications.service';
import { RequestUser, RequirePermissions } from '../../common/guards';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Req() req: { user: RequestUser }) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Get('staff-push-config')
  getStaffPushConfig() {
    return this.notificationsService.getStaffPushConfig();
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

  @Post('test-push')
  testPush(@Req() req: { user: RequestUser }) {
    return this.notificationsService.sendTestPushToUser(req.user.id);
  }
}
