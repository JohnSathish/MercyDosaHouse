import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getBusinessSettings() {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }
    return this.mapSettings(settings);
  }

  async updateBusinessSettings(data: Record<string, unknown>) {
    const settings = await this.prisma.businessSettings.findFirst();
    const updated = await this.prisma.businessSettings.update({
      where: { id: settings!.id },
      data: data as never,
    });
    return this.mapSettings(updated);
  }

  getBanners(activeOnly = true) {
    return this.prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  createBanner(data: { title: string; subtitle?: string; imageUrl: string; linkUrl?: string }) {
    return this.prisma.banner.create({ data });
  }

  updateBanner(id: string, data: Record<string, unknown>) {
    return this.prisma.banner.update({ where: { id }, data: data as never });
  }

  deleteBanner(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }

  getPaymentMethods() {
    return this.prisma.paymentMethodConfig.findMany();
  }

  async checkDeliveryPincode(pincode: string) {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) settings = await this.prisma.businessSettings.create({ data: {} });

    const normalized = pincode.replace(/\D/g, '').slice(0, 6);
    const meghalayaPrefixes = ['793', '794', '797', '798'];
    const available =
      normalized.length === 6 && meghalayaPrefixes.some((prefix) => normalized.startsWith(prefix));
    const minutes = settings.estimatedDeliveryMinutes ?? 30;

    return {
      available,
      pincode: normalized,
      estimatedMinutes: minutes,
      message: available
        ? `Estimated delivery: ${minutes}–${minutes + 5} minutes`
        : "Sorry, we don't currently deliver to this location.",
    };
  }

  private mapSettings(s: {
    businessName: string;
    tagline: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    deliveryCharge: { toNumber?: () => number } | number;
    packingCharge: { toNumber?: () => number } | number;
    minOrderAmount: { toNumber?: () => number } | number;
    openingHours: string | null;
    upiId: string | null;
    upiQrUrl: string | null;
    googleMapsEmbed: string | null;
  }) {
    const n = (v: { toNumber?: () => number } | number) => (typeof v === 'number' ? v : Number(v));
    return {
      businessName: s.businessName,
      tagline: s.tagline,
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      address: s.address || '',
      deliveryCharge: n(s.deliveryCharge),
      packingCharge: n(s.packingCharge),
      minOrderAmount: n(s.minOrderAmount),
      openingHours: s.openingHours || '',
      upiId: s.upiId,
      upiQrUrl: s.upiQrUrl,
      googleMapsEmbed: s.googleMapsEmbed,
    };
  }
}
