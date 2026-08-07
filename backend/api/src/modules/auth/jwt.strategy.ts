import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, RequestUser } from '../../common/guards';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const roleName = user.role?.name;
    const isSuperAdmin = roleName === 'SUPER_ADMIN';
    const permissions = user.role?.permissions.map((rp) => rp.permission.name) || [];

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      roles: roleName ? [roleName] : [],
      permissions: isSuperAdmin ? ['*'] : permissions,
      isSuperAdmin,
    };
  }
}
