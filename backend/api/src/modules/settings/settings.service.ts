import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_STORE_CLOSED_MESSAGE } from '@mdh/types';
import { DEFAULT_AUTH_CONFIG, parseAuthConfig, type AuthConfig } from './auth-config';
import { resolvePublicAssetUrl, resolveWebsiteUrl } from '../notifications/email-branding';

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

  /** Public: central restaurant open/closed status for all customer channels */
  async getRestaurantStatus() {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }
    return this.mapRestaurantStatus(settings);
  }

  async updateRestaurantStatus(
    data: {
      storeOpen: boolean;
      storeClosedMessage?: string | null;
      storeReopenMessage?: string | null;
      storeClosedReason?: string | null;
      operatingSchedule?: Record<string, unknown> | null;
    },
    changedById?: string,
  ) {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }

    const updated = await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: {
        storeOpen: data.storeOpen,
        storeClosedMessage: data.storeClosedMessage ?? undefined,
        storeReopenMessage: data.storeReopenMessage ?? undefined,
        storeClosedReason: data.storeClosedReason ?? undefined,
        operatingSchedule:
          data.operatingSchedule === undefined
            ? undefined
            : (data.operatingSchedule as Prisma.InputJsonValue),
        storeStatusChangedAt: new Date(),
        storeStatusChangedById: changedById ?? null,
      },
    });

    // Keep legacy mobile config field in sync (single source of truth is BusinessSettings)
    const appConfig = await this.prisma.mobileAppConfig.findFirst();
    if (appConfig) {
      await this.prisma.mobileAppConfig.update({
        where: { id: appConfig.id },
        data: {
          storeOpen: data.storeOpen,
          storeClosedMessage: data.storeClosedMessage ?? appConfig.storeClosedMessage,
        },
      });
    }

    return this.mapRestaurantStatus(updated);
  }

  /** Reject online customer orders when the restaurant is closed */
  async assertAcceptingOnlineOrders() {
    const status = await this.getRestaurantStatus();
    if (!status.storeOpen) {
      throw new BadRequestException(
        status.storeClosedMessage?.trim() || DEFAULT_STORE_CLOSED_MESSAGE,
      );
    }
  }

  async isStoreOpen(): Promise<boolean> {
    const status = await this.getRestaurantStatus();
    return status.storeOpen;
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
      fssaiEnabled: s.fssaiEnabled !== false,
      fssaiRegistrationNumber: (s.fssaiRegistrationNumber as string | null) ?? '21726006000529',
      fssaiBusinessName: (s.fssaiBusinessName as string | null) ?? 'John Sathish Soundararajan',
      fssaiBusinessAddress:
        (s.fssaiBusinessAddress as string | null) ??
        'THURINJIKOLLAI, NELLIKOLLAI PO, Bhuvanagiri block, Cuddalore, Tamil Nadu - 608074',
      fssaiPremisesAddress:
        (s.fssaiPremisesAddress as string | null) ??
        'DON BOSCO COLLEGE, TURA, Lower Chandmari, Tura Town, West Garo Hills, Meghalaya - 794001',
      fssaiNearestLandmark: (s.fssaiNearestLandmark as string | null) ?? 'DON BOSCO COLLEGE TUREA',
      fssaiKindOfBusiness: (s.fssaiKindOfBusiness as string | null) ?? 'Food Vending Establishment',
      fssaiIssuedOn: s.fssaiIssuedOn
        ? new Date(s.fssaiIssuedOn as string | Date).toISOString()
        : '2026-08-27T00:00:00.000Z',
      fssaiFeePaidUntil: s.fssaiFeePaidUntil
        ? new Date(s.fssaiFeePaidUntil as string | Date).toISOString()
        : '2027-08-26T00:00:00.000Z',
      fssaiCertificateUrl: (s.fssaiCertificateUrl as string | null) ?? null,
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
      preOrderMinDaysAhead:
        typeof s.preOrderMinDaysAhead === 'number'
          ? s.preOrderMinDaysAhead
          : Number(s.preOrderMinDaysAhead ?? 1),
      storeOpen: s.storeOpen !== false,
      storeClosedMessage: (s.storeClosedMessage as string | null) ?? null,
      storeReopenMessage: (s.storeReopenMessage as string | null) ?? null,
      storeClosedReason: (s.storeClosedReason as string | null) ?? null,
      storeStatusChangedAt: s.storeStatusChangedAt
        ? new Date(s.storeStatusChangedAt as string | Date).toISOString()
        : null,
      storeStatusChangedByName: null,
      operatingSchedule: (s.operatingSchedule as Record<string, unknown> | null) ?? null,
    };
  }

  private async mapRestaurantStatus(s: Record<string, unknown>) {
    let changedByName: string | null = null;
    const changedById = s.storeStatusChangedById as string | undefined;
    if (changedById) {
      const user = await this.prisma.user.findUnique({
        where: { id: changedById },
        select: { name: true },
      });
      changedByName = user?.name ?? null;
    }

    return {
      storeOpen: s.storeOpen !== false,
      storeClosedMessage: (s.storeClosedMessage as string | null) ?? null,
      storeReopenMessage: (s.storeReopenMessage as string | null) ?? null,
      storeClosedReason: (s.storeClosedReason as string | null) ?? null,
      storeStatusChangedAt: s.storeStatusChangedAt
        ? new Date(s.storeStatusChangedAt as string | Date).toISOString()
        : null,
      storeStatusChangedByName: changedByName,
      openingHours: (s.openingHours as string | null) ?? null,
      operatingSchedule: (s.operatingSchedule as Record<string, unknown> | null) ?? null,
    };
  }

  async getAuthConfig(): Promise<AuthConfig> {
    const settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      await this.prisma.businessSettings.create({ data: { authConfig: DEFAULT_AUTH_CONFIG } });
      return { ...DEFAULT_AUTH_CONFIG };
    }
    return parseAuthConfig(settings.authConfig);
  }

  async updateAuthConfig(patch: Record<string, unknown>): Promise<AuthConfig> {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }
    const {
      emailStatus: _emailStatus,
      smtpPass: _smtpPass,
      password: _password,
      SMTP_PASS: _smtp,
      ...safePatch
    } = patch;
    const next = parseAuthConfig({ ...parseAuthConfig(settings.authConfig), ...safePatch });
    await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: { authConfig: next as Prisma.InputJsonValue },
    });
    return next;
  }

  async getLoginEmailAssets() {
    const cfg = await this.getAuthConfig();
    const business = await this.prisma.businessSettings.findFirst({
      select: { websiteUrl: true },
    });
    const theme = await this.prisma.themeSettings.findFirst({
      select: { logoUrl: true },
    });
    const websiteUrl = resolveWebsiteUrl(
      cfg.websiteUrl || business?.websiteUrl,
      process.env.NEXT_PUBLIC_WEBSITE_URL,
    );
    const logoUrl = resolvePublicAssetUrl(
      theme?.logoUrl,
      websiteUrl,
      process.env.STORAGE_PUBLIC_URL,
    );
    return { cfg, websiteUrl, logoUrl };
  }
}
