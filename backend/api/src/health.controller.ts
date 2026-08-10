import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/guards';
import { PrismaService } from './prisma/prisma.service';
import { EmailService } from './modules/notifications/email.service';
import Redis from 'ioredis';

@Controller('health')
@SkipThrottle()
export class HealthController {
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
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
    const email = this.emailService.getStatus();
    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'mdh-api',
      checks: {
        ...checks,
        email: email.configured ? 'ok' : 'not_configured',
      },
      email,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('email')
  emailStatus() {
    return this.emailService.getStatus();
  }

  @Public()
  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
