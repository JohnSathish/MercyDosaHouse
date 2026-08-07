import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(data: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    usageLimit?: number;
    expiresAt?: Date;
  }) {
    return this.prisma.coupon.create({ data });
  }

  update(id: string, data: Record<string, unknown>) {
    return this.prisma.coupon.update({ where: { id }, data: data as never });
  }

  async validate(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Coupon expired');
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order ₹${coupon.minOrderAmount} required`);
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else {
      discount = Number(coupon.value);
    }

    return { coupon, discount };
  }
}
