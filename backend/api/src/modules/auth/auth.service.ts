import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  ForbiddenException,
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
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
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

interface CustomerEmailOtpSession {
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
  private customerEmailOtpSessions = new Map<
    string,
    { session: CustomerEmailOtpSession; expiresAt: number }
  >();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private sms: SmsService,
    private email: EmailService,
    private settings: SettingsService,
    private notifications: NotificationsService,
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

    void this.notifyStaffLogin(user);
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

    void this.notifyStaffLogin(user);
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

  private normalizeEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException({
        message: 'Please enter a valid email address.',
        code: 'EMAIL_INVALID',
      });
    }
    return normalized;
  }

  private generateCustomerOtp(): string {
    return String(crypto.randomInt(100000, 1000000));
  }

  private customerEmailOtpKey(sessionId: string) {
    return `customer-email-otp:${sessionId}`;
  }

  private customerEmailOtpCooldownKey(sessionId: string) {
    return `customer-email-otp:cooldown:${sessionId}`;
  }

  private async assertEmailOtpRateLimit(email: string, ip?: string) {
    if (!this.redis) return;
    const emailKey = `customer-email-otp:rl:email:${email}`;
    const emailCount = Number((await this.redis.incr(emailKey)) || 0);
    if (emailCount === 1) await this.redis.expire(emailKey, 900);
    if (emailCount > 8) {
      throw new HttpException(
        {
          message: 'Too many login attempts. Please wait a few minutes and try again.',
          code: 'EMAIL_OTP_RATE_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (ip) {
      const ipKey = `customer-email-otp:rl:ip:${ip}`;
      const ipCount = Number((await this.redis.incr(ipKey)) || 0);
      if (ipCount === 1) await this.redis.expire(ipKey, 900);
      if (ipCount > 20) {
        throw new HttpException(
          {
            message: 'Too many login attempts. Please wait a few minutes and try again.',
            code: 'EMAIL_OTP_RATE_LIMIT',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private async saveCustomerEmailOtpSession(
    sessionId: string,
    session: CustomerEmailOtpSession,
    ttlSeconds: number,
  ) {
    if (this.redis) {
      await this.redis.setex(
        this.customerEmailOtpKey(sessionId),
        ttlSeconds,
        JSON.stringify(session),
      );
      return;
    }
    this.customerEmailOtpSessions.set(sessionId, {
      session,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async getCustomerEmailOtpSession(
    sessionId: string,
  ): Promise<CustomerEmailOtpSession | null> {
    if (this.redis) {
      const raw = await this.redis.get(this.customerEmailOtpKey(sessionId));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as CustomerEmailOtpSession;
      } catch {
        return null;
      }
    }
    const row = this.customerEmailOtpSessions.get(sessionId);
    if (!row || row.expiresAt < Date.now()) {
      this.customerEmailOtpSessions.delete(sessionId);
      return null;
    }
    return row.session;
  }

  private async deleteCustomerEmailOtpSession(sessionId: string) {
    if (this.redis) {
      await this.redis.del(this.customerEmailOtpKey(sessionId));
      await this.redis.del(this.customerEmailOtpCooldownKey(sessionId));
      return;
    }
    this.customerEmailOtpSessions.delete(sessionId);
    this.customerEmailOtpCooldowns.delete(sessionId);
  }

  private async deliverCustomerEmailOtp(email: string, otp: string, ttlSeconds: number) {
    const minutes = Math.max(1, Math.round(ttlSeconds / 60));
    if (!this.email.isConfigured()) {
      return false;
    }
    const assets = await this.settings.getLoginEmailAssets();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { name: true },
    });
    const result = await this.email.sendCustomerLoginOtp({
      to: email,
      otp,
      expiryMinutes: minutes,
      customerName: existing?.name,
      websiteUrl: assets.websiteUrl,
      logoUrl: assets.logoUrl,
      senderName: assets.cfg.senderName,
      senderEmail: assets.cfg.senderEmail,
    });
    return result.sent;
  }

  private async findOrCreateCustomerByEmail(email: string) {
    let user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: this.userInclude(),
    });
    if (!user) {
      const customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
      user = await this.prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          roleId: customerRole?.id,
        },
        include: this.userInclude(),
      });
      void this.notifyNewCustomer(user);
    }
    return user;
  }

  private generateOtp(): string {
    const isProd = process.env.NODE_ENV === 'production';
    const demoMode = this.isDemoOtpMode();
    if (!isProd || demoMode) return '123456';
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashOtp(otp: string): string {
    const pepper = this.config.get<string>('JWT_SECRET') || 'dev-secret';
    return crypto.createHmac('sha256', pepper).update(otp).digest('hex');
  }

  private verifyOtpHash(otp: string, hash: string): boolean {
    const computed = this.hashOtp(otp);
    const a = Buffer.from(computed);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  private customerEmailOtpCooldowns = new Map<string, number>();

  private async setCustomerEmailOtpCooldown(sessionId: string, seconds: number) {
    if (this.redis) {
      await this.redis.setex(this.customerEmailOtpCooldownKey(sessionId), seconds, '1');
      return;
    }
    this.customerEmailOtpCooldowns.set(sessionId, Date.now() + seconds * 1000);
  }

  private async getCustomerEmailOtpCooldownTtl(sessionId: string): Promise<number> {
    if (this.redis) {
      const ttl = await this.redis.ttl(this.customerEmailOtpCooldownKey(sessionId));
      return ttl > 0 ? ttl : 0;
    }
    const until = this.customerEmailOtpCooldowns.get(sessionId);
    if (!until) return 0;
    const ttl = Math.ceil((until - Date.now()) / 1000);
    if (ttl <= 0) {
      this.customerEmailOtpCooldowns.delete(sessionId);
      return 0;
    }
    return ttl;
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

  async getAuthMethods() {
    const cfg = await this.settings.getAuthConfig();
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() || null;
    return {
      emailOtp: cfg.emailOtp,
      google: cfg.google && !!googleClientId,
      mobileOtp: cfg.mobileOtp,
      guest: cfg.guest,
      otpExpirySeconds: cfg.otpExpirySeconds,
      resendCooldownSeconds: cfg.resendCooldownSeconds,
      googleClientId: cfg.google ? googleClientId : null,
    };
  }

  async sendCustomerEmailOtp(email: string, ip?: string) {
    const cfg = await this.settings.getAuthConfig();
    if (!cfg.emailOtp) {
      throw new ForbiddenException({
        message: 'Email login is currently unavailable. Please try another method.',
        code: 'EMAIL_OTP_DISABLED',
      });
    }

    const normalized = this.normalizeEmail(email);
    await this.assertEmailOtpRateLimit(normalized, ip);

    const otp = this.generateCustomerOtp();
    const sessionId = uuidv4();
    const session: CustomerEmailOtpSession = {
      email: normalized,
      otpHash: this.hashOtp(otp),
      attempts: 0,
      resends: 0,
    };
    await this.saveCustomerEmailOtpSession(sessionId, session, cfg.otpExpirySeconds);
    await this.setCustomerEmailOtpCooldown(sessionId, cfg.resendCooldownSeconds);

    const sent = await this.deliverCustomerEmailOtp(normalized, otp, cfg.otpExpirySeconds);
    if (!sent) {
      await this.deleteCustomerEmailOtpSession(sessionId);
      throw new ServiceUnavailableException({
        message: "We couldn't send the email. Please try again in a moment.",
        code: 'EMAIL_OTP_SEND_FAILED',
      });
    }

    return {
      sessionId,
      maskedEmail: this.maskEmail(normalized),
      expiresIn: cfg.otpExpirySeconds,
      cooldownSeconds: cfg.resendCooldownSeconds,
    };
  }

  async verifyCustomerEmailOtp(sessionId: string, otp: string) {
    const cfg = await this.settings.getAuthConfig();
    if (!cfg.emailOtp) {
      throw new ForbiddenException({
        message: 'Email login is currently unavailable.',
        code: 'EMAIL_OTP_DISABLED',
      });
    }

    const session = await this.getCustomerEmailOtpSession(sessionId);
    if (!session) {
      throw new BadRequestException({
        message: 'That code has expired. Please request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    if (session.attempts >= cfg.maxAttempts) {
      await this.deleteCustomerEmailOtpSession(sessionId);
      throw new HttpException(
        {
          message: 'Too many attempts. Please request a new code.',
          code: 'OTP_TOO_MANY_ATTEMPTS',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.verifyOtpHash(otp, session.otpHash)) {
      session.attempts += 1;
      await this.saveCustomerEmailOtpSession(sessionId, session, cfg.otpExpirySeconds);
      const remaining = cfg.maxAttempts - session.attempts;
      throw new BadRequestException({
        message:
          remaining > 0
            ? "We couldn't verify that code. Please check the OTP and try again."
            : 'Too many attempts. Please request a new code.',
        code: remaining > 0 ? 'OTP_INVALID' : 'OTP_TOO_MANY_ATTEMPTS',
      });
    }

    await this.deleteCustomerEmailOtpSession(sessionId);
    const user = await this.findOrCreateCustomerByEmail(session.email);
    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked. Contact support.');
    }
    return this.buildAuthResponse(user);
  }

  async resendCustomerEmailOtp(sessionId: string, ip?: string) {
    const cfg = await this.settings.getAuthConfig();
    if (!cfg.emailOtp) {
      throw new ForbiddenException({
        message: 'Email login is currently unavailable.',
        code: 'EMAIL_OTP_DISABLED',
      });
    }

    const session = await this.getCustomerEmailOtpSession(sessionId);
    if (!session) {
      throw new BadRequestException({
        message: 'That code has expired. Please request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    if (session.resends >= LOGIN_OTP_MAX_RESENDS) {
      throw new HttpException(
        {
          message: 'Maximum resend limit reached. Please start again.',
          code: 'OTP_RESEND_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const cooldownTtl = await this.getCustomerEmailOtpCooldownTtl(sessionId);
    if (cooldownTtl > 0) {
      throw new BadRequestException({
        message: `Please wait ${cooldownTtl} seconds before requesting another code.`,
        code: 'OTP_COOLDOWN',
      });
    }

    await this.assertEmailOtpRateLimit(session.email, ip);

    const otp = this.generateCustomerOtp();
    session.otpHash = this.hashOtp(otp);
    session.attempts = 0;
    session.resends += 1;
    await this.saveCustomerEmailOtpSession(sessionId, session, cfg.otpExpirySeconds);
    await this.setCustomerEmailOtpCooldown(sessionId, cfg.resendCooldownSeconds);

    const sent = await this.deliverCustomerEmailOtp(session.email, otp, cfg.otpExpirySeconds);
    if (!sent) {
      throw new ServiceUnavailableException({
        message: "We couldn't send the email. Please try again in a moment.",
        code: 'EMAIL_OTP_SEND_FAILED',
      });
    }

    return {
      sessionId,
      maskedEmail: this.maskEmail(session.email),
      expiresIn: cfg.otpExpirySeconds,
      cooldownSeconds: cfg.resendCooldownSeconds,
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
    const cfg = await this.settings.getAuthConfig();
    if (!cfg.mobileOtp) {
      throw new ForbiddenException({
        message:
          "We're currently setting up secure mobile verification. Please use email or Google.",
        code: 'MOBILE_OTP_COMING_SOON',
      });
    }

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

    const otp = !isProd || demoMode ? '123456' : this.generateCustomerOtp();

    if (this.redis) {
      const cooldownKey = `otp:cooldown:${normalized}`;
      const existing = await this.redis.get(cooldownKey);
      if (existing) {
        throw new BadRequestException('Please wait before requesting another OTP');
      }
      await this.redis.setex(`otp:${normalized}`, cfg.otpExpirySeconds, this.hashOtp(otp));
      await this.redis.setex(cooldownKey, cfg.resendCooldownSeconds, '1');
    }

    if (smsConfigured && !demoMode) {
      const result = await this.sms.sendOtp(normalized, otp);
      if (!result.sent) {
        throw new ServiceUnavailableException({
          message: 'Verification service temporarily unavailable. Please try again later.',
          code: 'OTP_SEND_FAILED',
        });
      }
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string) {
    const normalized = this.normalizePhone(phone);
    let storedOtp: string | null = null;
    if (this.redis) {
      const storedHash = await this.redis.get(`otp:${normalized}`);
      if (storedHash && this.verifyOtpHash(otp, storedHash)) {
        storedOtp = otp;
      }
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
      void this.notifyNewCustomer(user);
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
    const methods = await this.getAuthMethods();
    if (!methods.google) {
      throw new ForbiddenException({
        message: 'Google login is currently unavailable. Please sign in with email.',
        code: 'GOOGLE_LOGIN_DISABLED',
      });
    }

    const webClientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const androidClientId = this.config.get<string>('GOOGLE_ANDROID_CLIENT_ID')?.trim();
    const audiences = [webClientId, androidClientId].filter(Boolean) as string[];
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences.length > 1 ? audiences : audiences[0],
      });
    } catch {
      throw new BadRequestException({
        message: "We couldn't complete Google sign-in. Please try again.",
        code: 'GOOGLE_AUTH_FAILED',
      });
    }
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) {
      throw new BadRequestException({
        message: "We couldn't complete Google sign-in. Please try again.",
        code: 'GOOGLE_AUTH_FAILED',
      });
    }
    const email = payload.email.trim().toLowerCase();

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: payload.sub }, { email: { equals: email, mode: 'insensitive' } }],
      },
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
          email,
          googleId: payload.sub,
          name: payload.name || email,
          roleId: customerRole?.id,
        },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });
      void this.notifyNewCustomer(user);
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

  private notifyNewCustomer(user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }) {
    const who = user.name || user.email || user.phone || 'New customer';
    void this.notifications.emitStaffInbox({
      eventKey: `CUSTOMER:${user.id}:REGISTERED`,
      type: NotificationType.CUSTOMER,
      category: 'CUSTOMER',
      title: '👤 New customer registration',
      body: `${who} created an account.`,
      referenceType: 'USER',
      referenceId: user.id,
    });
  }

  private notifyStaffLogin(user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: { name: string } | null;
  }) {
    if (!user.role?.name || user.role.name === 'CUSTOMER') return;
    const day = new Date().toISOString().slice(0, 10);
    void this.notifications.emitStaffInbox({
      eventKey: `SECURITY:LOGIN:${user.id}:${day}`,
      type: NotificationType.SECURITY,
      category: 'SYSTEM',
      title: '🔐 Staff login',
      body: `${user.name || user.email || 'A staff member'} signed in to Admin.`,
      referenceType: 'USER',
      referenceId: user.id,
    });
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
