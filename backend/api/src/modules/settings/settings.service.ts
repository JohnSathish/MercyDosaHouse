import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_STORE_CLOSED_MESSAGE } from '@mdh/types';
import { applyChargePlaceholders, toStoredUploadPath } from '@mdh/utils';
import { DEFAULT_AUTH_CONFIG, parseAuthConfig, type AuthConfig } from './auth-config';
import {
  DEFAULT_FEEDBACK_CONFIG,
  parseFeedbackConfig,
  type FeedbackConfig,
} from './feedback-config';
import { DEFAULT_INVOICE_CONFIG, parseInvoiceConfig } from './invoice-config';
import { DEFAULT_APP_PROMO_CONFIG, parseAppPromoConfig } from './app-promo-config';
import { resolvePublicAssetUrl, resolveWebsiteUrl } from '../notifications/email-branding';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
  ) {}

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
    if (!settings) {
      throw new BadRequestException('Business settings are not initialized');
    }
    const patch = this.pickBusinessSettingsPatch(data);
    const updated = await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: patch as never,
    });
    void this.notifications.emitStaffInbox({
      eventKey: `SETTINGS:BUSINESS:${updated.updatedAt.toISOString()}`,
      type: NotificationType.SYSTEM,
      category: 'SYSTEM',
      title: '⚙️ System configuration changed',
      body: 'Business settings were updated.',
      referenceType: 'SETTINGS',
      referenceId: updated.id,
    });
    return this.mapSettings(updated);
  }

  private pickBusinessSettingsPatch(data: Record<string, unknown>): Record<string, unknown> {
    const keys = [
      'businessName',
      'tagline',
      'phone',
      'whatsapp',
      'email',
      'address',
      'deliveryCharge',
      'packingCharge',
      'minOrderAmount',
      'freeDeliveryLimit',
      'deliveryRadiusKm',
      'estimatedDeliveryMinutes',
      'openingHours',
      'deliveryHours',
      'upiId',
      'upiQrUrl',
      'googleMapsEmbed',
      'socialLinks',
      'footerCopyright',
      'announcementBar',
      'gstNumber',
      'websiteUrl',
      'fssaiEnabled',
      'fssaiRegistrationNumber',
      'fssaiBusinessName',
      'fssaiBusinessAddress',
      'fssaiPremisesAddress',
      'fssaiNearestLandmark',
      'fssaiKindOfBusiness',
      'fssaiIssuedOn',
      'fssaiFeePaidUntil',
      'fssaiCertificateUrl',
      'receiptShowLogo',
      'receiptShowQr',
      'receiptShowGst',
      'receiptShowAddress',
      'receiptShowCustomer',
      'receiptShowCashier',
      'receiptShowPayment',
      'receiptFooterMessage',
      'receiptFontSize',
      'receiptPaperWidth',
      'receiptCopies',
      'receiptAutoPrintPayment',
      'receiptAutoPrintKot',
      'preOrderMinDaysAhead',
      'storeOpen',
      'storeClosedMessage',
      'storeReopenMessage',
      'storeClosedReason',
      'operatingSchedule',
      'autoMenuAvailability',
    ] as const;
    const patch: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in data) patch[key] = data[key];
    }
    if ('fssaiCertificateUrl' in patch) {
      const raw = patch.fssaiCertificateUrl;
      if (raw == null || String(raw).trim() === '') {
        patch.fssaiCertificateUrl = null;
      } else {
        patch.fssaiCertificateUrl = toStoredUploadPath(String(raw).trim());
      }
    }
    for (const dateKey of ['fssaiIssuedOn', 'fssaiFeePaidUntil'] as const) {
      if (!(dateKey in patch)) continue;
      const value = patch[dateKey];
      if (value == null || value === '') {
        patch[dateKey] = null;
      } else {
        const parsed = new Date(String(value));
        patch[dateKey] = Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
    return patch;
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
    const deliveryCharge = n(s.deliveryCharge);
    const packingCharge = n(s.packingCharge);
    const freeDeliveryLimit = n(s.freeDeliveryLimit ?? 299);
    const charges = { deliveryCharge, packingCharge, freeDeliveryLimit };
    return {
      businessName: String(s.businessName ?? 'Mercy Dosa House'),
      tagline: String(s.tagline ?? ''),
      phone: String(s.phone ?? ''),
      whatsapp: String(s.whatsapp ?? ''),
      email: String(s.email ?? ''),
      address: String(s.address ?? ''),
      deliveryCharge,
      packingCharge,
      minOrderAmount: n(s.minOrderAmount),
      freeDeliveryLimit,
      deliveryRadiusKm: n(s.deliveryRadiusKm ?? 10),
      estimatedDeliveryMinutes:
        typeof s.estimatedDeliveryMinutes === 'number'
          ? s.estimatedDeliveryMinutes
          : Number(s.estimatedDeliveryMinutes ?? 30),
      openingHours: String(s.openingHours ?? ''),
      deliveryHours: (s.deliveryHours as string | null) ?? null,
      announcementBar:
        applyChargePlaceholders((s.announcementBar as string | null) ?? null, charges) || null,
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
      fssaiCertificateUrl: s.fssaiCertificateUrl
        ? toStoredUploadPath(String(s.fssaiCertificateUrl))
        : null,
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
      autoMenuAvailability: s.autoMenuAvailability === true,
      feedback: parseFeedbackConfig(s.feedbackConfig),
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

  async getFeedbackConfig(): Promise<FeedbackConfig> {
    const settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      await this.prisma.businessSettings.create({
        data: { feedbackConfig: DEFAULT_FEEDBACK_CONFIG },
      });
      return { ...DEFAULT_FEEDBACK_CONFIG };
    }
    return parseFeedbackConfig(settings.feedbackConfig);
  }

  async updateFeedbackConfig(patch: Record<string, unknown>): Promise<FeedbackConfig> {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }
    const next = parseFeedbackConfig({
      ...parseFeedbackConfig(settings.feedbackConfig),
      ...patch,
    });
    await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: { feedbackConfig: next as Prisma.InputJsonValue },
    });
    return next;
  }

  async getInvoiceConfig() {
    const settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      await this.prisma.businessSettings.create({
        data: { invoiceConfig: DEFAULT_INVOICE_CONFIG as Prisma.InputJsonValue },
      });
      return { ...DEFAULT_INVOICE_CONFIG };
    }
    const parsed = parseInvoiceConfig(settings.invoiceConfig);
    if (!parsed.bank.upiId && settings.upiId) {
      parsed.bank.upiId = settings.upiId;
    }
    return parsed;
  }

  async updateInvoiceConfig(patch: Record<string, unknown>) {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) settings = await this.prisma.businessSettings.create({ data: {} });
    const current = parseInvoiceConfig(settings.invoiceConfig);
    const next = parseInvoiceConfig({
      ...current,
      ...patch,
      bank: {
        ...current.bank,
        ...(patch.bank && typeof patch.bank === 'object'
          ? (patch.bank as Record<string, unknown>)
          : {}),
      },
      email: {
        ...current.email,
        ...(patch.email && typeof patch.email === 'object'
          ? (patch.email as Record<string, unknown>)
          : {}),
      },
    });
    await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: { invoiceConfig: next as Prisma.InputJsonValue },
    });
    return next;
  }

  async getAppPromoConfig() {
    const settings = await this.prisma.businessSettings.findFirst();
    if (!settings) {
      await this.prisma.businessSettings.create({
        data: { appPromoConfig: DEFAULT_APP_PROMO_CONFIG as Prisma.InputJsonValue },
      });
      return { ...DEFAULT_APP_PROMO_CONFIG };
    }
    return parseAppPromoConfig(settings.appPromoConfig);
  }

  async updateAppPromoConfig(patch: Record<string, unknown>) {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) settings = await this.prisma.businessSettings.create({ data: {} });
    const next = parseAppPromoConfig({
      ...parseAppPromoConfig(settings.appPromoConfig),
      ...patch,
    });
    await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: { appPromoConfig: next as Prisma.InputJsonValue },
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
