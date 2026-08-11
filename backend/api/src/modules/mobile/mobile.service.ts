import { Injectable } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CmsService } from '../cms/cms.service';
import { SettingsService } from '../settings/settings.service';
import { MarketingService } from '../marketing/marketing.service';
import { DEFAULT_MOBILE_FEATURE_FLAGS, DEFAULT_MOBILE_HOME_SECTIONS } from './mobile.defaults';

@Injectable()
export class MobileService {
  constructor(
    private prisma: PrismaService,
    private cmsService: CmsService,
    private settingsService: SettingsService,
    private marketingService: MarketingService,
  ) {}

  /** Public: full remote config bundle for mobile apps */
  async getConfig() {
    const now = new Date();
    const [
      appConfig,
      theme,
      business,
      featureFlags,
      homepageSections,
      offers,
      banners,
      navigation,
      paymentMethods,
      faqs,
      marketing,
    ] = await Promise.all([
      this.getOrCreateAppConfig(),
      this.cmsService.getThemeSettings(),
      this.settingsService.getBusinessSettings(),
      this.prisma.mobileFeatureFlag.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.getPublishedHomeSections(),
      this.prisma.offer.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.navigationItem.findMany({
        where: { menuKey: 'mobile', isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.paymentMethodConfig.findMany({ orderBy: { method: 'asc' } }),
      this.prisma.faq.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.marketingService.getPublicBundle('ANDROID'),
    ]);

    const flagsMap = Object.fromEntries(featureFlags.map((f) => [f.key, f.enabled]));

    return {
      configVersion: appConfig.configVersion,
      updatedAt: appConfig.updatedAt.toISOString(),
      refreshIntervalSeconds: appConfig.refreshIntervalSeconds,
      apiBaseUrl: appConfig.apiBaseUrl,
      branding: {
        appName: appConfig.appName,
        tagline: appConfig.tagline,
        logoUrl: appConfig.logoUrl ?? theme.logoUrl,
        splashLogoUrl: appConfig.splashLogoUrl ?? theme.logoUrl,
        splashBackgroundColor: appConfig.splashBackgroundColor,
        splashBackgroundImageUrl: appConfig.splashBackgroundImageUrl,
        appIconUrl: appConfig.appIconUrl,
      },
      theme: {
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        fontFamily: theme.fontFamily,
        borderRadius: theme.borderRadius,
        darkModeDefault: appConfig.darkModeDefault,
        allowDarkMode: appConfig.allowDarkMode,
        allowLightMode: appConfig.allowLightMode,
      },
      maintenance: {
        maintenanceMode: appConfig.maintenanceMode,
        maintenanceMessage: appConfig.maintenanceMessage,
        maintenanceEndsAt: appConfig.maintenanceEndsAt?.toISOString() ?? null,
      },
      versionControl: {
        minAppVersion: appConfig.minAppVersion,
        latestAppVersion: appConfig.latestAppVersion,
        forceUpdate: appConfig.forceUpdate,
        softUpdateMessage: appConfig.softUpdateMessage,
      },
      store: {
        storeOpen: business.storeOpen !== false,
        storeClosedMessage: business.storeClosedMessage ?? appConfig.storeClosedMessage,
        storeReopenMessage: business.storeReopenMessage ?? null,
        emergencyNotice: appConfig.emergencyNotice,
        openingHours: business.openingHours ?? null,
        deliveryHours: business.deliveryHours ?? null,
      },
      delivery: {
        deliveryCharge: business.deliveryCharge,
        packingCharge: business.packingCharge,
        minOrderAmount: business.minOrderAmount,
        freeDeliveryLimit: business.freeDeliveryLimit ?? 299,
        deliveryRadiusKm: business.deliveryRadiusKm ?? 10,
        estimatedDeliveryMinutes: business.estimatedDeliveryMinutes ?? 30,
        preOrderDiscountPct: business.preOrderDiscountPct ?? 10,
        preOrderMinDaysAhead: business.preOrderMinDaysAhead ?? 1,
        preOrderStackWithCoupons: business.preOrderStackWithCoupons ?? false,
      },
      business: {
        businessName: business.businessName,
        phone: business.phone ?? null,
        whatsapp: business.whatsapp ?? null,
        email: business.email ?? null,
        address: business.address ?? null,
        upiId: business.upiId ?? null,
      },
      homepage: homepageSections,
      announcements: marketing.announcements,
      offers: offers.map(this.mapOffer),
      banners,
      navigation,
      featureFlags: flagsMap,
      marketing,
      paymentMethods: paymentMethods.map((p) => ({
        method: p.method,
        isEnabled: p.isEnabled,
        config: (p.config as Record<string, unknown>) ?? null,
      })),
      help: {
        faqs,
        whatsapp: business.whatsapp ?? null,
        phone: business.phone ?? null,
        email: business.email ?? null,
      },
    };
  }

  async getConfigVersion() {
    const appConfig = await this.getOrCreateAppConfig();
    return {
      configVersion: appConfig.configVersion,
      updatedAt: appConfig.updatedAt.toISOString(),
    };
  }

  async getAdminConfig() {
    const [appConfig, featureFlags, homepageSections] = await Promise.all([
      this.getOrCreateAppConfig(),
      this.prisma.mobileFeatureFlag.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.cmsSection.findMany({
        where: { pageKey: 'mobile.home' },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    return { appConfig, featureFlags, homepageSections };
  }

  async updateAppConfig(data: Record<string, unknown>) {
    const config = await this.getOrCreateAppConfig();
    const updated = await this.prisma.mobileAppConfig.update({
      where: { id: config.id },
      data: {
        ...(data as Prisma.MobileAppConfigUpdateInput),
        configVersion: { increment: 1 },
      },
    });

    if (typeof data.storeOpen === 'boolean') {
      const business = await this.prisma.businessSettings.findFirst();
      if (business) {
        await this.prisma.businessSettings.update({
          where: { id: business.id },
          data: {
            storeOpen: data.storeOpen,
            storeClosedMessage:
              typeof data.storeClosedMessage === 'string' ? data.storeClosedMessage : undefined,
            storeStatusChangedAt: new Date(),
          },
        });
      }
    }

    return updated;
  }

  async updateFeatureFlags(flags: { key: string; enabled: boolean }[]) {
    await this.prisma.$transaction(
      flags.map((f) =>
        this.prisma.mobileFeatureFlag.update({
          where: { key: f.key },
          data: { enabled: f.enabled },
        }),
      ),
    );
    await this.bumpConfigVersion();
    return this.prisma.mobileFeatureFlag.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async reorderHomeSections(items: { id: string; sortOrder: number; isEnabled?: boolean }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.cmsSection.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            ...(item.isEnabled !== undefined ? { isEnabled: item.isEnabled } : {}),
          },
        }),
      ),
    );
    await this.bumpConfigVersion();
    return this.getPublishedHomeSections();
  }

  async publishHomeSections() {
    const sections = await this.prisma.cmsSection.findMany({
      where: { pageKey: 'mobile.home' },
    });
    await this.prisma.$transaction(
      sections.map((s) =>
        this.prisma.cmsSection.update({
          where: { id: s.id },
          data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() },
        }),
      ),
    );
    await this.bumpConfigVersion();
    return this.getPublishedHomeSections();
  }

  async seedDefaults() {
    await this.getOrCreateAppConfig();
    for (const flag of DEFAULT_MOBILE_FEATURE_FLAGS) {
      await this.prisma.mobileFeatureFlag.upsert({
        where: { key: flag.key },
        create: flag,
        update: {},
      });
    }
    for (const section of DEFAULT_MOBILE_HOME_SECTIONS) {
      await this.prisma.cmsSection.upsert({
        where: {
          pageKey_sectionKey: { pageKey: 'mobile.home', sectionKey: section.sectionKey },
        },
        create: {
          pageKey: 'mobile.home',
          sectionKey: section.sectionKey,
          title: section.title,
          content: {},
          sortOrder: section.sortOrder,
          isEnabled: true,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        update: {},
      });
    }
  }

  private async getPublishedHomeSections() {
    return this.prisma.cmsSection.findMany({
      where: {
        pageKey: 'mobile.home',
        isEnabled: true,
        status: ContentStatus.PUBLISHED,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private async getOrCreateAppConfig() {
    let config = await this.prisma.mobileAppConfig.findFirst();
    if (!config) {
      config = await this.prisma.mobileAppConfig.create({ data: {} });
      await this.seedDefaults();
    }
    return config;
  }

  private async bumpConfigVersion() {
    const config = await this.getOrCreateAppConfig();
    await this.prisma.mobileAppConfig.update({
      where: { id: config.id },
      data: { configVersion: { increment: 1 } },
    });
  }

  private mapAnnouncement(a: {
    id: string;
    title: string;
    message: string;
    type: string;
    linkUrl: string | null;
    priority: number;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
  }) {
    return {
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      linkUrl: a.linkUrl,
      priority: a.priority,
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
      isActive: a.isActive,
    };
  }

  private mapOffer(o: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    discountPct: Prisma.Decimal | null;
    type: string;
    buttonLabel: string | null;
    buttonUrl: string | null;
    displayPosition: string | null;
    sortOrder: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }) {
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      imageUrl: o.imageUrl,
      discountPct: o.discountPct ? Number(o.discountPct) : null,
      type: o.type,
      buttonLabel: o.buttonLabel,
      buttonUrl: o.buttonUrl,
      displayPosition: o.displayPosition,
      sortOrder: o.sortOrder,
      isActive: o.isActive,
      startsAt: o.startsAt?.toISOString() ?? null,
      endsAt: o.endsAt?.toISOString() ?? null,
    };
  }
}
