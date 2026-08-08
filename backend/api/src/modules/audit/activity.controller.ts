import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService, ActivityPeriod } from './activity.service';
import { RequirePermissions } from '../../common/guards';

@ApiTags('activity')
@ApiBearerAuth()
@RequirePermissions('reports.read')
@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get('dashboard')
  getDashboard(@Query('period') period?: ActivityPeriod) {
    return this.activityService.getDashboard(period ?? 'today');
  }

  @Get('logs')
  listLogs(
    @Query('period') period?: ActivityPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('module') module?: string,
    @Query('severity') severity?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.listLogs({
      period,
      startDate,
      endDate,
      search,
      module,
      severity,
      userId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('logs/:id')
  getLog(@Param('id') id: string) {
    return this.activityService.getLog(id);
  }

  @Get('login-history')
  getLoginHistory(@Query('limit') limit?: string) {
    return this.activityService.getLoginHistory(limit ? parseInt(limit) : 50);
  }

  @Get('security')
  getSecurity() {
    return this.activityService.getSecurityDashboard();
  }

  @Get('sessions')
  getSessions() {
    return this.activityService.getSessions();
  }

  @Delete('sessions/:sessionId')
  terminateSession(@Param('sessionId') sessionId: string) {
    return this.activityService.terminateSession(sessionId);
  }

  @Get('users/:userId')
  getUserActivity(@Param('userId') userId: string) {
    return this.activityService.getUserActivity(userId);
  }

  @Get('insights')
  getInsights() {
    return this.activityService.getInsights();
  }

  @Get('export')
  export(@Query('period') period?: ActivityPeriod) {
    return this.activityService
      .exportLogs(period ?? 'week')
      .then((csv) => ({ csv, filename: 'activity-logs.csv' }));
  }
}
