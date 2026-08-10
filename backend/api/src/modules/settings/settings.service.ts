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

  private mapSettings(s: Record<string, unknown>) {
    const n = (v: unknown) => (typeof v === 'number' ? v : Number(v));
    return {
      businessName: String(s.businessName ?? 'Mercy Dosa House'),
      tagline: String(s.tagline ?? ''),
      phone: String(s.phone ?? ''),
      whatsapp: String(s.whatsapp ?? ''),
      email: String(s.email ?? ''),
      address: String(s.address ?? ''),
      deliveryCharge: n(s.deliveryCharge),
      packingCharge: n(s.packingCharge),
      minOrderAmount: n(s.minOrderAmount),
      freeDeliveryLimit: n(s.freeDeliveryLimit ?? 299),
      deliveryRadiusKm: n(s.deliveryRadiusKm ?? 10),
      estimatedDeliveryMinutes:
        typeof s.estimatedDeliveryMinutes === 'number'
          ? s.estimatedDeliveryMinutes
          : Number(s.estimatedDeliveryMinutes ?? 30),
      openingHours: String(s.openingHours ?? ''),
      deliveryHours: (s.deliveryHours as string | null) ?? null,
      upiId: s.upiId as string | null,
      upiQrUrl: s.upiQrUrl as string | null,
      googleMapsEmbed: s.googleMapsEmbed as string | null,
      gstNumber: (s.gstNumber as string | null) ?? null,
      websiteUrl: (s.websiteUrl as string | null) ?? null,
      receiptShowLogo: s.receiptShowLogo !== false,
      receiptShowQr: s.receiptShowQr !== false,
      receiptShowGst: s.receiptShowGst !== false,
      receiptShowAddress: s.receiptShowAddress !== false,
      receiptShowCustomer: s.receiptShowCustomer !== false,
      receiptShowCashier: s.receiptShowCashier !== false,
      receiptShowPayment: s.receiptShowPayment !== false,
      receiptFooterMessage: (s.receiptFooterMessage as string | null) ?? null,
      receiptFontSize: (s.receiptFontSize as 'small' | 'normal' | 'large') ?? 'normal',
      receiptPaperWidth: (s.receiptPaperWidth as '58mm' | '80mm') ?? '80mm',
      receiptCopies:
        typeof s.receiptCopies === 'number' ? s.receiptCopies : Number(s.receiptCopies ?? 1),
      receiptAutoPrintPayment: s.receiptAutoPrintPayment === true,
      receiptAutoPrintKot: s.receiptAutoPrintKot === true,
      preOrderDiscountPct:
        typeof s.preOrderDiscountPct === 'number'
          ? s.preOrderDiscountPct
          : Number(s.preOrderDiscountPct ?? 10),
      preOrderMinDaysAhead:
        typeof s.preOrderMinDaysAhead === 'number'
          ? s.preOrderMinDaysAhead
          : Number(s.preOrderMinDaysAhead ?? 1),
      preOrderStackWithCoupons: s.preOrderStackWithCoupons === true,
    };
  }
}
