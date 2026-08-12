import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import Redis from 'ioredis';

const ONLINE_KEY = 'mdh:visitors:online';
const TOTAL_KEY = 'mdh:visitors:total';
const SEEN_PREFIX = 'mdh:visitors:seen:';
const ONLINE_TTL_MS = 45_000;
const UNIQUE_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

@Injectable()
export class VisitorsService implements OnModuleDestroy {
  private redis: Redis | null = null;
  private memoryOnline = new Map<string, number>();
  private memoryTotal = 0;
  private memorySeen = new Set<string>();

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: false,
      });
      this.redis.on('error', () => {
        /* health endpoint covers Redis; avoid noisy crash loops */
      });
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
    }
  }

  normalizeVisitorId(raw?: string): string {
    const trimmed = raw?.trim() ?? '';
    if (/^[a-zA-Z0-9_-]{8,64}$/.test(trimmed)) return trimmed;
    return randomUUID().replace(/-/g, '');
  }

  async heartbeat(visitorIdRaw?: string): Promise<{
    visitorId: string;
    online: number;
    total: number;
    serverTime: string;
  }> {
    const visitorId = this.normalizeVisitorId(visitorIdRaw);
    const now = Date.now();

    if (this.redis) {
      try {
        const seenKey = `${SEEN_PREFIX}${visitorId}`;
        const multi = this.redis.multi();
        multi.zadd(ONLINE_KEY, now, visitorId);
        multi.zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_TTL_MS);
        multi.set(seenKey, '1', 'EX', UNIQUE_TTL_SEC, 'NX');
        const tx = await multi.exec();
        const setNx = tx?.[2]?.[1];
        if (setNx === 'OK') {
          await this.redis.incr(TOTAL_KEY);
        }
        const [online, totalRaw] = await Promise.all([
          this.redis.zcard(ONLINE_KEY),
          this.redis.get(TOTAL_KEY),
        ]);

        return {
          visitorId,
          online: Math.max(Number(online) || 0, 1),
          total: Math.max(Number(totalRaw) || 0, 1),
          serverTime: new Date(now).toISOString(),
        };
      } catch {
        /* fall through to memory */
      }
    }

    this.pruneMemory(now);
    this.memoryOnline.set(visitorId, now);
    if (!this.memorySeen.has(visitorId)) {
      this.memorySeen.add(visitorId);
      this.memoryTotal += 1;
    }

    return {
      visitorId,
      online: Math.max(this.memoryOnline.size, 1),
      total: Math.max(this.memoryTotal, 1),
      serverTime: new Date(now).toISOString(),
    };
  }

  async getStats(): Promise<{ online: number; total: number; serverTime: string }> {
    const now = Date.now();

    if (this.redis) {
      try {
        await this.redis.zremrangebyscore(ONLINE_KEY, 0, now - ONLINE_TTL_MS);
        const [online, totalRaw] = await Promise.all([
          this.redis.zcard(ONLINE_KEY),
          this.redis.get(TOTAL_KEY),
        ]);
        return {
          online: Number(online) || 0,
          total: Number(totalRaw) || 0,
          serverTime: new Date(now).toISOString(),
        };
      } catch {
        /* fall through */
      }
    }

    this.pruneMemory(now);
    return {
      online: this.memoryOnline.size,
      total: this.memoryTotal,
      serverTime: new Date(now).toISOString(),
    };
  }

  /** Stable fingerprint helper if clients send IP+UA (optional, unused by default). */
  fingerprint(ip: string, ua: string): string {
    return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
  }

  private pruneMemory(now: number) {
    for (const [id, ts] of this.memoryOnline) {
      if (now - ts > ONLINE_TTL_MS) this.memoryOnline.delete(id);
    }
  }
}
