import { createHmac, timingSafeEqual } from 'crypto';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import type { Request } from 'express';

export type OrderChannel = 'WEBSITE' | 'ANDROID';

const CLIENT_ID = 'mercy-android-customer';
const PACKAGE_NAME = 'com.mercydosahouse.customer';
const TOKEN_TYP = 'android-app';
const MAX_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class AppChannelService {
  private readonly logger = new Logger(AppChannelService.name);
  private redis: Redis | null = null;
  private readonly memoryNonces = new Map<string, number>();

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
      this.redis.connect().catch(() => {
        this.logger.warn('App-channel nonce store: Redis unavailable, using memory fallback');
        this.redis = null;
      });
    }
  }

  getSecret(): string | null {
    const secret = this.config.get<string>('ANDROID_APP_CHANNEL_SECRET')?.trim();
    if (secret) return secret;
    if (this.config.get('NODE_ENV') !== 'production') {
      return 'mdh-dev-android-channel';
    }
    return null;
  }

  isConfigured(): boolean {
    return Boolean(this.getSecret());
  }

  resolve(req: Request): OrderChannel {
    const token = header(req, 'x-mdh-app-token');
    if (token) {
      try {
        const payload = this.jwt.verify<{ typ?: string; client?: string }>(token);
        if (payload.typ === TOKEN_TYP && payload.client === CLIENT_ID) return 'ANDROID';
      } catch {
        /* Token expired or unsigned — still accept native-app signals below. */
      }
    }
    const client = header(req, 'x-mdh-client');
    const pkg = header(req, 'x-mdh-package');
    if (client === CLIENT_ID && pkg === PACKAGE_NAME) return 'ANDROID';
    const ua = header(req, 'user-agent').toLowerCase();
    if (ua.includes('okhttp') || ua.includes('mercydosa')) return 'ANDROID';
    return 'WEBSITE';
  }

  async issueAppToken(req: Request): Promise<{ token: string; expiresIn: number }> {
    const secret = this.getSecret();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Android app channel is not configured. Set ANDROID_APP_CHANNEL_SECRET on the server.',
      );
    }
    const client = header(req, 'x-mdh-client');
    const pkg = header(req, 'x-mdh-package');
    const ts = header(req, 'x-mdh-ts');
    const nonce = header(req, 'x-mdh-nonce');
    const sign = header(req, 'x-mdh-sign');
    if (client !== CLIENT_ID || pkg !== PACKAGE_NAME) {
      throw new UnauthorizedException('Unrecognized app client');
    }
    const timestamp = Number(ts);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) {
      throw new UnauthorizedException('App attestation expired');
    }
    if (!nonce || nonce.length < 16 || nonce.length > 80) {
      throw new UnauthorizedException('Invalid app nonce');
    }
    const message = `${ts}\n${nonce}\nPOST\n/auth/app-channel`;
    const expected = createHmac('sha256', secret).update(message).digest('hex');
    if (!sign || !safeEqualHex(sign, expected)) {
      throw new UnauthorizedException('Invalid app attestation');
    }
    const fresh = await this.consumeNonce(nonce);
    if (!fresh) throw new UnauthorizedException('App attestation already used');

    const expiresIn = 15 * 60;
    const token = this.jwt.sign({ typ: TOKEN_TYP, client: CLIENT_ID }, { expiresIn });
    return { token, expiresIn };
  }
  private async consumeNonce(nonce: string): Promise<boolean> {
    const key = `appchan:nonce:${nonce}`;
    if (this.redis) {
      try {
        const ok = await this.redis.set(key, '1', 'EX', 300, 'NX');
        return ok === 'OK';
      } catch {
        /* fall through */
      }
    }
    this.pruneMemoryNonces();
    if (this.memoryNonces.has(nonce)) return false;
    this.memoryNonces.set(nonce, Date.now() + 300_000);
    return true;
  }

  private pruneMemoryNonces() {
    const now = Date.now();
    for (const [key, exp] of this.memoryNonces) {
      if (exp <= now) this.memoryNonces.delete(key);
    }
  }
}

function header(req: Request, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? (value[0] ?? '') : String(value ?? '').trim();
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase());
  const right = Buffer.from(b.toLowerCase());
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
