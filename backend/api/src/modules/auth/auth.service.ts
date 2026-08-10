import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../notifications/sms.service';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private redis: Redis | null = null;
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private sms: SmsService,
  ) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
    this.googleClient = new OAuth2Client(config.get('GOOGLE_CLIENT_ID'));
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked. Contact support.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  getOtpStatus() {
    return {
      ...this.sms.getStatus(),
      redisAvailable: !!this.redis,
      demoMode: this.isDemoOtpMode(),
      fallbackMethods: ['email', 'google'],
    };
  }

  /** Temporary demo OTP (123456) for staging — set OTP_DEMO_MODE=true, disable when SMS is live. */
  private isDemoOtpMode(): boolean {
    return process.env.OTP_DEMO_MODE === 'true';
  }

  async sendOtp(phone: string) {
    const normalized = phone.replace(/\s/g, '');
    if (!/^\+?[0-9]{10,13}$/.test(normalized)) {
      throw new BadRequestException('Invalid phone number');
    }

    const isProd = process.env.NODE_ENV === 'production';
    const demoMode = this.isDemoOtpMode();
    const smsConfigured = this.sms.isConfigured();

    if (isProd && !smsConfigured && !demoMode) {
      throw new ServiceUnavailableException({
        message:
          'Verification service temporarily unavailable. Please sign in with email or Google, or try again later.',
        code: 'OTP_SERVICE_UNAVAILABLE',
        fallbackMethods: ['email', 'google'],
      });
    }

    if (isProd && !this.redis && !demoMode) {
      throw new ServiceUnavailableException({
        message: 'Verification service temporarily unavailable. Please try again later.',
        code: 'OTP_STORAGE_UNAVAILABLE',
      });
    }

    const otp =
      !isProd || demoMode ? '123456' : String(Math.floor(100000 + Math.random() * 900000));

    if (this.redis) {
      const cooldownKey = `otp:cooldown:${normalized}`;
      const existing = await this.redis.get(cooldownKey);
      if (existing) {
        throw new BadRequestException('Please wait before requesting another OTP');
      }
      await this.redis.setex(`otp:${normalized}`, 300, otp);
      await this.redis.setex(cooldownKey, 60, '1');
    } else if (!isProd || demoMode) {
      console.log(`[${demoMode ? 'DEMO' : 'DEV'} OTP] Phone: ${normalized}, OTP: ${otp}`);
    }

    if (smsConfigured && !demoMode) {
      const result = await this.sms.sendOtp(normalized, otp);
      if (!result.sent) {
        throw new ServiceUnavailableException({
          message: 'Verification service temporarily unavailable. Please try again later.',
          code: 'OTP_SEND_FAILED',
        });
      }
    } else if (!isProd || demoMode) {
      console.log(`[${demoMode ? 'DEMO' : 'DEV'} OTP] SMS skipped — use OTP: ${otp}`);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string) {
    const normalized = phone.replace(/\s/g, '');
    let storedOtp: string | null = null;
    if (this.redis) {
      storedOtp = await this.redis.get(`otp:${normalized}`);
    }

    // Dev/demo fallback: accept 123456 when SMS is not used
    if (
      !storedOtp &&
      (process.env.NODE_ENV !== 'production' || this.isDemoOtpMode()) &&
      otp === '123456'
    ) {
      storedOtp = '123456';
    }

    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (this.redis) await this.redis.del(`otp:${normalized}`);

    let user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user) {
      const customerRole = await this.prisma.role.findUnique({
        where: { name: 'CUSTOMER' },
      });
      user = await this.prisma.user.create({
        data: {
          phone: normalized,
          name: `Customer ${normalized.slice(-4)}`,
          roleId: customerRole?.id,
        },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  async googleAuth(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.config.get('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new BadRequestException('Invalid Google token');

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user) {
      const customerRole = await this.prisma.role.findUnique({
        where: { name: 'CUSTOMER' },
      });
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.name || payload.email,
          roleId: customerRole?.id,
        },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.buildAuthResponse(stored.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Logged out' };
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    role: {
      name: string;
      permissions: { permission: { name: string } }[];
    } | null;
  }) {
    const roleName = user.role?.name;
    const isSuperAdmin = roleName === 'SUPER_ADMIN';
    const permissions = user.role?.permissions.map((rp) => rp.permission.name) || [];

    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, phone: user.phone },
      { expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m' },
    );

    const refreshTokenValue = uuidv4();
    const refreshExpires = this.config.get('JWT_REFRESH_EXPIRES') || '7d';
    const days = parseInt(refreshExpires) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId: user.id, expiresAt },
    });

    return {
      tokens: { accessToken, refreshToken: refreshTokenValue },
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        roles: roleName ? [roleName] : [],
        permissions: isSuperAdmin ? ['*'] : permissions,
        isSuperAdmin,
      },
    };
  }
}
