import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'mdh-api', timestamp: new Date().toISOString() };
  }
}
