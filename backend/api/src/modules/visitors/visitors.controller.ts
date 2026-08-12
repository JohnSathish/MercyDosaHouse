import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/guards';
import { VisitorsService } from './visitors.service';

class HeartbeatDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;
}

@ApiTags('visitors')
@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Public()
  @Get('stats')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getStats() {
    return this.visitorsService.getStats();
  }

  @Public()
  @Post('heartbeat')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  heartbeat(@Body() body: HeartbeatDto) {
    return this.visitorsService.heartbeat(body?.visitorId);
  }
}
