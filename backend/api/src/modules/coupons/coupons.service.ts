import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const discounts = await this.prisma.coupon.findMany({
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
        categories: { include: { category: { select: { id: true, name: true } } } },
        customers: { select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return discounts.map((discount) => this.mapDiscount(discount));
  }

  async create(data: {
    name: string;
    code?: string;
    description?: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    startsAt?: string;
    endsAt?: string;
    startTime?: string;
    endTime?: string;
    usageLimit?: number;
    perCustomerUsageLimit?: number;
    productIds?: string[];
    categoryIds?: string[];
    customerIds?: string[];
    isActive?: boolean;
  }) {
    const code = this.normalizeCode(data.code) || `AUTO-${randomUUID().slice(0, 8).toUpperCase()}`;
    const created = await this.prisma.coupon.create({
      data: {
        name: data.name?.trim() || 'Untitled discount',
        code,
        description: data.description?.trim() || null,
        type: data.type,
        value: this.numberOrZero(data.value),
        minOrderAmount: this.numberOrZero(data.minOrderAmount),
        maxDiscount: this.optionalNumber(data.maxDiscount),
        startsAt: this.optionalDate(data.startsAt),
        endsAt: this.optionalDate(data.endsAt),
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        usageLimit: this.optionalInt(data.usageLimit),
        perCustomerUsageLimit: this.optionalInt(data.perCustomerUsageLimit),
        isActive: data.isActive !== false,
        products: this.productConnections(data.productIds),
        categories: this.categoryConnections(data.categoryIds),
        customers: this.customerConnections(data.customerIds),
      },
    });
    return this.findOne(created.id);
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Discount not found');

    const productIds = this.stringArray(data.productIds);
    const categoryIds = this.stringArray(data.categoryIds);
    const customerIds = this.stringArray(data.customerIds);
    const updateData: Record<string, unknown> = {};
    if (typeof data.name === 'string') updateData.name = data.name.trim();
    if (typeof data.code === 'string' && data.code.trim()) {
      updateData.code = this.normalizeCode(data.code);
    }
    if (typeof data.description === 'string')
      updateData.description = data.description.trim() || null;
    if (data.type === 'PERCENTAGE' || data.type === 'FIXED') updateData.type = data.type;
    if (data.value !== undefined) updateData.value = this.numberOrZero(data.value);
    if (data.minOrderAmount !== undefined) {
      updateData.minOrderAmount = this.numberOrZero(data.minOrderAmount);
    }
    if (data.maxDiscount !== undefined)
      updateData.maxDiscount = this.optionalNumber(data.maxDiscount);
    if (data.startsAt !== undefined) updateData.startsAt = this.optionalDate(data.startsAt);
    if (data.endsAt !== undefined) updateData.endsAt = this.optionalDate(data.endsAt);
    if (data.startTime !== undefined) updateData.startTime = data.startTime || null;
    if (data.endTime !== undefined) updateData.endTime = data.endTime || null;
    if (data.usageLimit !== undefined) updateData.usageLimit = this.optionalInt(data.usageLimit);
    if (data.perCustomerUsageLimit !== undefined) {
      updateData.perCustomerUsageLimit = this.optionalInt(data.perCustomerUsageLimit);
    }
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;

    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({ where: { id }, data: updateData as never });
      if (productIds || categoryIds || customerIds) {
        if (productIds) {
          await tx.couponProduct.deleteMany({ where: { couponId: id } });
          if (productIds.length) {
            await tx.couponProduct.createMany({
              data: productIds.map((productId) => ({ couponId: id, productId })),
              skipDuplicates: true,
            });
          }
        }
        if (categoryIds) {
          await tx.couponCategory.deleteMany({ where: { couponId: id } });
          if (categoryIds.length) {
            await tx.couponCategory.createMany({
              data: categoryIds.map((categoryId) => ({ couponId: id, categoryId })),
              skipDuplicates: true,
            });
          }
        }
        if (customerIds) {
          await tx.couponCustomer.deleteMany({ where: { couponId: id } });
          if (customerIds.length) {
            await tx.couponCustomer.createMany({
              data: customerIds.map((userId) => ({ couponId: id, userId })),
              skipDuplicates: true,
            });
          }
        }
      }
    });
    return this.findOne(id);
  }

  async findOne(id: string) {
    const discount = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
        categories: { include: { category: { select: { id: true, name: true } } } },
        customers: { select: { userId: true } },
      },
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return this.mapDiscount(discount);
  }

  async remove(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  async duplicate(id: string) {
    const discount = await this.prisma.coupon.findUnique({
      where: { id },
      include: { products: true, categories: true, customers: true },
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return this.create({
      name: `${discount.name || discount.code} Copy`,
      description: discount.description ?? undefined,
      type: discount.type,
      value: Number(discount.value),
      minOrderAmount: Number(discount.minOrderAmount),
      maxDiscount: discount.maxDiscount == null ? undefined : Number(discount.maxDiscount),
      startsAt: discount.startsAt?.toISOString(),
      endsAt: discount.endsAt?.toISOString(),
      startTime: discount.startTime ?? undefined,
      endTime: discount.endTime ?? undefined,
      usageLimit: discount.usageLimit ?? undefined,
      perCustomerUsageLimit: discount.perCustomerUsageLimit ?? undefined,
      productIds: discount.products.map((item) => item.productId),
      categoryIds: discount.categories.map((item) => item.categoryId),
      customerIds: discount.customers.map((item) => item.userId),
      isActive: false,
    });
  }

  async calculate(
    code: string | undefined,
    subtotal: number,
    items: { productId: string; categoryId?: string; totalPrice: number }[],
    userId?: string,
  ) {
    const categoryByProduct = new Map(
      (
        await this.prisma.product.findMany({
          where: { id: { in: items.map((item) => item.productId) } },
          select: { id: true, categoryId: true },
        })
      ).map((product) => [product.id, product.categoryId]),
    );
    const resolvedItems = items.map((item) => ({
      ...item,
      categoryId: item.categoryId ?? categoryByProduct.get(item.productId) ?? '',
    }));
    const discounts = await this.prisma.coupon.findMany({
      where: code ? { code: this.normalizeCode(code) } : { isActive: true },
      include: { products: true, categories: true, customers: true },
      orderBy: { createdAt: 'desc' },
    });
    const eligible: Array<{ discount: any; amount: number }> = [];
    for (const discount of discounts) {
      const amount = await this.getEligibleAmount(discount, subtotal, resolvedItems, userId);
      if (amount > 0) eligible.push({ discount, amount });
    }
    if (code && !eligible.length) throw new BadRequestException('Invalid or ineligible discount');
    return eligible.sort((a, b) => b.amount - a.amount)[0] ?? null;
  }

  async getAvailable(
    subtotal: number,
    productIds: string[] = [],
    userId?: string,
    cartItems: { productId: string; variantId?: string; quantity: number }[] = [],
  ) {
    const now = new Date();
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          include: { variants: true },
        })
      : [];
    const itemProducts = cartItems.length
      ? cartItems.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
          return {
            productId: item.productId,
            categoryId: product?.categoryId ?? '',
            totalPrice: Number(variant?.price ?? product?.price ?? 0) * item.quantity,
          };
        })
      : products.map((product) => ({
          productId: product.id,
          categoryId: product.categoryId,
          totalPrice: subtotal,
        }));
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      include: { products: true, categories: true, customers: true },
      orderBy: { createdAt: 'desc' },
    });

    const eligible: Array<{
      id: string;
      name: string;
      code: string;
      description: string | null;
      type: string;
      value: number;
      minOrderAmount: number;
      maxDiscount: number | null;
      discount: number;
      startsAt: string | null;
      endsAt: string | null;
    }> = [];
    for (const coupon of coupons) {
      const amount = await this.getEligibleAmount(coupon, subtotal, itemProducts, userId);
      if (amount <= 0) continue;
      eligible.push({
        id: coupon.id,
        name: coupon.name || coupon.code,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: Number(coupon.value),
        minOrderAmount: Number(coupon.minOrderAmount),
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
        discount: amount,
        startsAt: coupon.startsAt?.toISOString() ?? null,
        endsAt: coupon.endsAt?.toISOString() ?? coupon.expiresAt?.toISOString() ?? null,
      });
    }
    return eligible.sort((a, b) => b.discount - a.discount);
  }

  private async getEligibleAmount(
    coupon: {
      isActive: boolean;
      usageLimit: number | null;
      usageCount: number;
      minOrderAmount: unknown;
      maxDiscount: unknown;
      value: unknown;
      type: 'PERCENTAGE' | 'FIXED';
      startsAt: Date | null;
      endsAt: Date | null;
      startTime: string | null;
      endTime: string | null;
      expiresAt: Date | null;
      perCustomerUsageLimit: number | null;
      products: { productId: string }[];
      categories: { categoryId: string }[];
      customers: { userId: string }[];
      id: string;
    },
    subtotal: number,
    items: { productId: string; categoryId: string; totalPrice: number }[],
    userId?: string,
  ) {
    const now = new Date();
    if (!coupon.isActive || (coupon.startsAt && coupon.startsAt > now)) return 0;
    if ((coupon.endsAt || coupon.expiresAt) && (coupon.endsAt || coupon.expiresAt)! < now) return 0;
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) return 0;
    if (subtotal < Number(coupon.minOrderAmount)) return 0;
    if (!this.matchesTimeWindow(coupon.startTime, coupon.endTime, now)) return 0;
    if (
      coupon.customers.length &&
      (!userId || !coupon.customers.some((c) => c.userId === userId))
    ) {
      const assigned = userId
        ? await this.prisma.userCoupon.findUnique({
            where: { userId_couponId: { userId, couponId: coupon.id } },
          })
        : null;
      if (!assigned) return 0;
    }
    if (userId && coupon.perCustomerUsageLimit != null) {
      const used = await this.prisma.order.count({
        where: { couponId: coupon.id, userId, status: { not: 'CANCELLED' } },
      });
      if (used >= coupon.perCustomerUsageLimit) return 0;
    }

    const productIds = new Set(coupon.products.map((item) => item.productId));
    const categoryIds = new Set(coupon.categories.map((item) => item.categoryId));
    const hasTargeting = productIds.size > 0 || categoryIds.size > 0;
    const eligibleSubtotal = hasTargeting
      ? items
          .filter((item) => productIds.has(item.productId) || categoryIds.has(item.categoryId))
          .reduce((sum, item) => sum + item.totalPrice, 0)
      : subtotal;
    if (eligibleSubtotal <= 0) return 0;

    let amount =
      coupon.type === 'PERCENTAGE'
        ? (eligibleSubtotal * Number(coupon.value)) / 100
        : Number(coupon.value);
    if (coupon.maxDiscount != null) amount = Math.min(amount, Number(coupon.maxDiscount));
    return Math.max(0, Math.min(amount, eligibleSubtotal));
  }

  private matchesTimeWindow(startTime: string | null, endTime: string | null, date: Date) {
    if (!startTime && !endTime) return true;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    const current = hour * 60 + minute;
    const parse = (value: string | null) => {
      const match = value?.match(/^(\d{1,2}):(\d{2})$/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    };
    const start = parse(startTime);
    const end = parse(endTime);
    return (start == null || current >= start) && (end == null || current <= end);
  }

  private mapDiscount(discount: any) {
    return {
      ...discount,
      value: Number(discount.value),
      minOrderAmount: Number(discount.minOrderAmount),
      maxDiscount: discount.maxDiscount == null ? null : Number(discount.maxDiscount),
      startsAt: discount.startsAt?.toISOString() ?? null,
      endsAt: discount.endsAt?.toISOString() ?? null,
      expiresAt: discount.expiresAt?.toISOString() ?? null,
      productIds: discount.products?.map((item: any) => item.productId) ?? [],
      categoryIds: discount.categories?.map((item: any) => item.categoryId) ?? [],
      customerIds: discount.customers?.map((item: any) => item.userId) ?? [],
    };
  }

  private productConnections(ids?: string[]) {
    return this.stringArray(ids)?.length
      ? { create: this.stringArray(ids)!.map((productId) => ({ productId })) }
      : undefined;
  }

  private categoryConnections(ids?: string[]) {
    return this.stringArray(ids)?.length
      ? { create: this.stringArray(ids)!.map((categoryId) => ({ categoryId })) }
      : undefined;
  }

  private customerConnections(ids?: string[]) {
    return this.stringArray(ids)?.length
      ? { create: this.stringArray(ids)!.map((userId) => ({ userId })) }
      : undefined;
  }

  private stringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  private normalizeCode(value?: string) {
    return value?.trim().toUpperCase() || undefined;
  }

  private optionalDate(value: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  private optionalInt(value: unknown) {
    const number = this.optionalNumber(value);
    return number == null ? null : Math.floor(number);
  }

  private numberOrZero(value: unknown) {
    return this.optionalNumber(value) ?? 0;
  }
}
