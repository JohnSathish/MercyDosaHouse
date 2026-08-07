import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { RequestUser } from '../../common/guards';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Req() req: { user: RequestUser }) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Post('device-token')
  registerDevice(
    @Req() req: { user: RequestUser },
    @Body() body: { token: string; platform: string },
  ) {
    return this.notificationsService.registerDevice(req.user.id, body.token, body.platform);
  }
}
