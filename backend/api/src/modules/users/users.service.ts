import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
      addresses: user.addresses,
    };
  }

  updateProfile(userId: string, data: { name?: string; email?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  createAddress(
    userId: string,
    data: {
      label?: string;
      line1: string;
      line2?: string;
      landmark?: string;
      city: string;
      pincode: string;
      isDefault?: boolean;
    },
  ) {
    return this.prisma.address.create({ data: { ...data, userId } });
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
