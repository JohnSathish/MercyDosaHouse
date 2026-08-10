import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AddressType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAddressInput {
  contactName: string;
  mobileNumber: string;
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  deliveryNotes?: string;
  addressType?: AddressType;
  isDefault?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeAddressInput(data: Partial<CreateAddressInput>): Partial<CreateAddressInput> {
    const optionalString = (v?: string) => (v?.trim() ? v.trim() : undefined);
    const optionalNumber = (v?: number) => (v != null && !Number.isNaN(v) ? v : undefined);

    return {
      ...data,
      contactName: data.contactName?.trim(),
      mobileNumber: data.mobileNumber?.replace(/\D/g, '').slice(-10),
      label: optionalString(data.label),
      line1: data.line1?.trim(),
      line2: optionalString(data.line2),
      landmark: optionalString(data.landmark),
      city: data.city?.trim(),
      state: data.state?.trim(),
      pincode: data.pincode?.trim(),
      country: optionalString(data.country) ?? data.country,
      latitude: optionalNumber(data.latitude),
      longitude: optionalNumber(data.longitude),
      deliveryNotes: optionalString(data.deliveryNotes),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      createdAt: user.createdAt,
      addresses: user.addresses,
    };
  }

  updateProfile(userId: string, data: { name?: string; email?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createAddress(userId: string, data: CreateAddressInput) {
    const clean = this.sanitizeAddressInput(data) as CreateAddressInput;
    if (
      !clean.contactName ||
      !clean.mobileNumber ||
      !clean.line1 ||
      !clean.city ||
      !clean.pincode
    ) {
      throw new BadRequestException('Missing required address fields');
    }

    if (clean.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        contactName: clean.contactName,
        mobileNumber: clean.mobileNumber,
        label: clean.label,
        line1: clean.line1,
        line2: clean.line2,
        landmark: clean.landmark,
        city: clean.city,
        state: clean.state ?? 'Meghalaya',
        pincode: clean.pincode,
        country: clean.country ?? 'India',
        latitude: clean.latitude,
        longitude: clean.longitude,
        deliveryNotes: clean.deliveryNotes,
        addressType: clean.addressType ?? AddressType.HOME,
        isDefault: clean.isDefault ?? false,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, data: Partial<CreateAddressInput>) {
    const clean = this.sanitizeAddressInput(data);
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundException('Address not found');

    if (clean.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(clean)) {
      if (value !== undefined) updateData[key] = value;
    }

    if (
      updateData.contactName !== undefined &&
      typeof updateData.contactName === 'string' &&
      !updateData.contactName
    ) {
      throw new BadRequestException('Contact name is required');
    }
    if (
      updateData.mobileNumber !== undefined &&
      typeof updateData.mobileNumber === 'string' &&
      !updateData.mobileNumber
    ) {
      throw new BadRequestException('Mobile number is required');
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });
  }

  deleteAddress(userId: string, addressId: string) {
    return this.prisma.address.deleteMany({ where: { id: addressId, userId } });
  }

  getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { product: { include: { category: true, images: true } } },
    });
    return favorites.map((f) => f.product);
  }

  addFavorite(userId: string, productId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  }

  removeFavorite(userId: string, productId: string) {
    return this.prisma.favorite.deleteMany({ where: { userId, productId } });
  }

  async getCheckoutProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        role: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const recentOrders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        deliveryAddress: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      preferredPayment: user.preferredPayment,
      preferredDelivery: user.preferredDelivery,
      addresses: user.addresses,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        grandTotal: Number(o.grandTotal),
      })),
    };
  }

  updatePreferences(
    userId: string,
    data: { preferredPayment?: import('@prisma/client').PaymentMethod; preferredDelivery?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredPayment: data.preferredPayment,
        preferredDelivery: data.preferredDelivery,
      },
      select: { id: true, preferredPayment: true, preferredDelivery: true },
    });
  }
}
