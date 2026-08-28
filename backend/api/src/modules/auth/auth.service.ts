import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../notifications/sms.service';
import { EmailService } from '../notifications/email.service';
import Redis from 'ioredis';

const LOGIN_OTP_TTL_SEC = 300;
const LOGIN_OTP_COOLDOWN_SEC = 60;
const LOGIN_OTP_MAX_ATTEMPTS = 5;
const LOGIN_OTP_MAX_RESENDS = 3;

interface LoginOtpSession {
  userId: string;
  email: string;
  otpHash: string;
  attempts: number;
  resends: number;
}

@Injectable()
export class AuthService {
  private redis: Redis | null = null;
  private googleClient: OAuth2Client;
  /** In-memory fallback for login OTP sessions when Redis is unavailable (dev/demo only). */
  private devLoginOtpSessions = new Map<string, { session: LoginOtpSession; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private sms: SmsService,
    private email: EmailService,
  ) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
    this.googleClient = new OAuth2Client(config.get('GOOGLE_CLIENT_ID'));
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: this.userInclude(),
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked. Contact support.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.email) {
      throw new BadRequestException('No email address on file for this account.');
    }

    return this.buildAuthResponse(user);
  }

  async verifyLoginOtp(sessionId: string, otp: string) {
    const session = await this.getLoginOtpSession(sessionId);
    if (!session) {
      throw new BadRequestException('Invalid or expired OTP session. Please sign in again.');
    }

    if (session.attempts >= LOGIN_OTP_MAX_ATTEMPTS) {
      await this.deleteLoginOtpSession(sessionId);
      throw new HttpException(
        'Too many failed attempts. Please sign in again to receive a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isValid = this.verifyOtpHash(otp, session.otpHash);
    if (!isValid) {
      session.attempts += 1;
      await this.saveLoginOtpSession(sessionId, session);
      const remaining = LOGIN_OTP_MAX_ATTEMPTS - session.attempts;
      throw new BadRequestException(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Invalid OTP. Please sign in again.',
      );
    }

    await this.deleteLoginOtpSession(sessionId);
    await this.redis?.del(`login-otp:cooldown:${sessionId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: this.userInclude(),
    });

    if (!user || user.isBlocked) {
      throw new UnauthorizedException('Account is blocked or not found.');
    }

    return this.buildAuthResponse(user);
  }

  async resendLoginOtp(sessionId: string) {
    const session = await this.getLoginOtpSession(sessionId);
    if (!session) {
      throw new BadRequestException('Invalid or expired OTP session. Please sign in again.');
    }

    if (session.resends >= LOGIN_OTP_MAX_RESENDS) {
      throw new HttpException(
        'Maximum resend limit reached. Please sign in again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.redis) {
      const cooldownKey = `login-otp:cooldown:${sessionId}`;
      const onCooldown = await this.redis.get(cooldownKey);
      if (onCooldown) {
        const ttl = await this.redis.ttl(cooldownKey);
        throw new BadRequestException(
          `Please wait ${Math.max(ttl, 1)} seconds before requesting another OTP.`,
        );
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: this.userInclude(),
    });

    if (!user?.email) {
      throw new BadRequestException('Invalid session. Please sign in again.');
    }

    const otp = this.generateOtp();
    session.otpHash = this.hashOtp(otp);
    session.attempts = 0;
    session.resends += 1;
    await this.saveLoginOtpSession(sessionId, session);

    if (this.redis) {
      await this.redis.setex(`login-otp:cooldown:${sessionId}`, LOGIN_OTP_COOLDOWN_SEC, '1');
    }

    await this.deliverLoginOtp(user.email, otp, user.name);

    return {
      message: 'OTP resent successfully',
      maskedEmail: this.maskEmail(user.email),
      expiresIn: LOGIN_OTP_TTL_SEC,
      cooldownSeconds: LOGIN_OTP_COOLDOWN_SEC,
    };
  }

  private async initiateLoginOtp(user: { id: string; email: string | null; name: string | null }) {
    const isProd = process.env.NODE_ENV === 'production';
    const demoMode = this.isDemoOtpMode();
    const emailConfigured = this.email.isConfigured();

    if (isProd && !emailConfigured && !demoMode) {
      throw new ServiceUnavailableException({
        message: 'Email verification service temporarily unavailable. Please try again later.',
        code: 'EMAIL_OTP_UNAVAILABLE',
      });
    }

    if (isProd && !this.redis && !demoMode) {
      throw new ServiceUnavailableException({
        message: 'Verification service temporarily unavailable. Please try again later.',
        code: 'OTP_STORAGE_UNAVAILABLE',
      });
    }

    const otp = this.generateOtp();
    const sessionId = uuidv4();
    const session: LoginOtpSession = {
      userId: user.id,
      email: user.email!,
      otpHash: this.hashOtp(otp),
      attempts: 0,
      resends: 0,
    };

    await this.saveLoginOtpSession(sessionId, session);

    if (this.redis) {
      await this.redis.setex(`login-otp:cooldown:${sessionId}`, LOGIN_OTP_COOLDOWN_SEC, '1');
    }

    const delivery = await this.deliverLoginOtp(user.email!, otp, user.name);
    if (isProd && !demoMode && !delivery.sent) {
      await this.deleteLoginOtpSession(sessionId);
      throw new ServiceUnavailableException({
        message: 'Failed to send verification email. Please try again later.',
        code: 'EMAIL_OTP_SEND_FAILED',
      });
    }

    return {
      requiresOtp: true as const,
      sessionId,
      maskedEmail: this.maskEmail(user.email!),
      expiresIn: LOGIN_OTP_TTL_SEC,
      cooldownSeconds: LOGIN_OTP_COOLDOWN_SEC,
    };
  }

  private async deliverLoginOtp(email: string, otp: string, name: string | null) {
    const isProd = process.env.NODE_ENV === 'production';
    const demoMode = this.isDemoOtpMode();

    if (!isProd || demoMode) {
      console.log(`[${demoMode ? 'DEMO' : 'DEV'} Email OTP] ${email}: ${otp}`);
    }

    if (!this.email.isConfigured()) {
      return { sent: false };
    }

    if (demoMode) {
      return { sent: true };
    }

    const result = await this.email.send({
      to: email,
      subject: 'Your Mercy Dosa House login verification code',
      text: `Your Mercy Dosa House login verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0b4a2d; margin-bottom: 8px;">Mercy Dosa House</h2>
          <p style="color: #555;">Hi${name ? ` ${name}` : ''},</p>
          <p style="color: #555;">Your login verification code is:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0b4a2d; margin: 24px 0;">${otp}</p>
          <p style="color: #888; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">If you did not attempt to sign in, please ignore this email.</p>
        </div>
      `,
    });

    return result;
  }

  private generateOtp(): string {
    const isProd = process.env.NODE_ENV === 'production';
    const demoMode = this.isDemoOtpMode();
    if (!isProd || demoMode) return '123456';
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private verifyOtpHash(otp: string, hash: string): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const demoMode = this.isDemoOtpMode();
    if ((!isProd || demoMode) && otp === '123456') return true;
    return this.hashOtp(otp) === hash;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    const visible = local.length <= 2 ? local[0] : local.slice(0, 1);
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
  }

  private loginOtpKey(sessionId: string): string {
    return `login-otp:${sessionId}`;
  }

  private async getLoginOtpSession(sessionId: string): Promise<LoginOtpSession | null> {
    if (!this.redis) {
      if (process.env.NODE_ENV !== 'production' || this.isDemoOtpMode()) {
        return null;
      }
      return null;
    }
    const raw = await this.redis.get(this.loginOtpKey(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginOtpSession;
    } catch {
      return null;
    }
  }

  private async saveLoginOtpSession(sessionId: string, session: LoginOtpSession): Promise<void> {
    if (this.redis) {
      await this.redis.setex(
        this.loginOtpKey(sessionId),
        LOGIN_OTP_TTL_SEC,
        JSON.stringify(session),
      );
    }
  }

  private async deleteLoginOtpSession(sessionId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(this.loginOtpKey(sessionId));
    }
  }

  getOtpStatus() {
    return {
      ...this.email.getStatus(),
      smsAvailable: this.sms.isConfigured(),
      redisAvailable: !!this.redis,
      demoMode: this.isDemoOtpMode(),
      loginOtpMethod: 'email',
      fallbackMethods: ['google'],
    };
  }

  /** Temporary demo OTP (123456) for staging — set OTP_DEMO_MODE=true, disable when SMS is live. */
  private isDemoOtpMode(): boolean {
    return process.env.OTP_DEMO_MODE === 'true';
  }

  /** Normalize to 10-digit Indian mobile — avoids duplicate accounts for +91/91/10-digit variants. */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length >= 10 ? digits.slice(-10) : digits;
    if (!/^[6-9]\d{9}$/.test(normalized)) {
      throw new BadRequestException('Invalid phone number');
    }
    return normalized;
  }

  private userInclude() {
    return {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    } as const;
  }

  private async findUserByPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    return this.prisma.user.findFirst({
      where: {
        OR: [{ phone: normalized }, { phone: `+91${normalized}` }, { phone: `91${normalized}` }],
      },
      include: this.userInclude(),
    });
  }

  async sendOtp(phone: string) {
    const normalized = this.normalizePhone(phone);

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
    const normalized = this.normalizePhone(phone);
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

    let user = await this.findUserByPhone(normalized);

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
        include: this.userInclude(),
      });
    } else if (user.phone !== normalized) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phone: normalized },
        include: this.userInclude(),
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
