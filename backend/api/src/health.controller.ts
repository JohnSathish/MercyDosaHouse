import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/guards';
import { PrismaService } from './prisma/prisma.service';
import Redis from 'ioredis';

@Controller('health')
@SkipThrottle()
export class HealthController {
  private redis: Redis | null = null;

  constructor(private prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    }
  }

  @Public()
  @Get()
  async check() {
    const checks: Record<string, string> = { api: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    if (this.redis) {
      try {
        await this.redis.ping();
        checks.redis = 'ok';
      } catch {
        checks.redis = 'error';
      }
    } else {
      checks.redis = 'not_configured';
    }

    const healthy = checks.database === 'ok';
    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'mdh-api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
