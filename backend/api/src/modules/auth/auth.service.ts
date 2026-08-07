import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private redis: Redis | null = null;
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  async sendOtp(phone: string) {
    const otp =
      process.env.NODE_ENV === 'production'
        ? String(Math.floor(100000 + Math.random() * 900000))
        : '123456';

    if (this.redis) {
      await this.redis.setex(`otp:${phone}`, 300, otp);
    } else {
      console.log(`[DEV OTP] Phone: ${phone}, OTP: ${otp}`);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string) {
    let storedOtp: string | null = null;
    if (this.redis) {
      storedOtp = await this.redis.get(`otp:${phone}`);
    } else {
      storedOtp = otp === '123456' ? '123456' : null;
    }

    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (this.redis) await this.redis.del(`otp:${phone}`);

    let user = await this.prisma.user.findUnique({
      where: { phone },
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
          phone,
          name: `Customer ${phone.slice(-4)}`,
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
