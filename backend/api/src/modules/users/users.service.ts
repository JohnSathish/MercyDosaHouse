import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        contactName: data.contactName,
        mobileNumber: data.mobileNumber,
        label: data.label,
        line1: data.line1,
        line2: data.line2,
        landmark: data.landmark,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country ?? 'India',
        latitude: data.latitude,
        longitude: data.longitude,
        deliveryNotes: data.deliveryNotes,
        addressType: data.addressType ?? AddressType.HOME,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, data: Partial<CreateAddressInput>) {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundException('Address not found');

    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: {
        contactName: data.contactName,
        mobileNumber: data.mobileNumber,
        label: data.label,
        line1: data.line1,
        line2: data.line2,
        landmark: data.landmark,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        deliveryNotes: data.deliveryNotes,
        addressType: data.addressType,
        isDefault: data.isDefault,
      },
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
}
