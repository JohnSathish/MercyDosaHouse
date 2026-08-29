import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnnouncementPlatform,
  AnnouncementType,
  ContentStatus,
  DeliveryAvailabilityStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { nextPromotionDate } from '@mdh/utils';
import { PrismaService } from '../../prisma/prisma.service';

const PRIORITY_WEIGHT: Record<string, number> = {
  EMERGENCY: 100,
  DELIVERY_UPDATE: 80,
  IMPORTANT_NOTICE: 60,
  PROMOTION: 40,
  GENERAL: 20,
};

type PlatformFilter = 'WEBSITE' | 'ANDROID';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class MarketingService {
  private configVersion = 1;

  constructor(private prisma: PrismaService) {}

  async getPublicBundle(platform: PlatformFilter = 'WEBSITE') {
    const [announcements, delivery] = await Promise.all([
      this.getActiveAnnouncements(platform),
      this.getDeliveryConfig(),
    ]);

    const mapped = await Promise.all(
      announcements.map(async (announcement) => {
        const item = this.mapAnnouncement(announcement);
        if (
          item.promotionProductId &&
          item.promotionQuantityLimit != null &&
          item.promotionNextAvailableDate
        ) {
          return {
            ...item,
            promotionRemainingQuantity: await this.getPromotionRemainingQuantity(
              item.promotionProductId,
              item.promotionNextAvailableDate,
              item.promotionQuantityLimit,
            ),
          };
        }
        return item;
      }),
    );
    const byPlacement: Record<string, typeof mapped> = {};

    for (const item of mapped) {
      for (const placement of item.placements) {
        if (!byPlacement[placement]) byPlacement[placement] = [];
        byPlacement[placement].push(item);
      }
    }

    for (const key of Object.keys(byPlacement)) {
      byPlacement[key].sort((a, b) =>
        key === 'POPUP'
          ? b.priority - a.priority || this.comparePriority(a, b)
          : this.comparePriority(a, b),
      );
      byPlacement[key] = [byPlacement[key][0]!];
    }

    return {
      version: this.configVersion,
      updatedAt: new Date().toISOString(),
      announcements: mapped,
      byPlacement,
      promotionalPopup:
        byPlacement.POPUP?.find((item) => item.type === AnnouncementType.POPUP) ?? null,
      delivery: delivery ? this.mapDeliveryConfig(delivery) : null,
    };
  }

  async getDashboard() {
    const now = new Date();
    const [all, offers, delivery] = await Promise.all([
      this.prisma.announcement.findMany(),
      this.prisma.offer.findMany(),
      this.getDeliveryConfig(),
    ]);

    const lifecycle = (a: {
      status: ContentStatus;
      startsAt: Date | null;
      endsAt: Date | null;
      isActive: boolean;
    }) => this.computeLifecycle(a, now);

    return {
      announcements: {
        active: all.filter((a) => lifecycle(a) === 'ACTIVE').length,
        scheduled: all.filter((a) => lifecycle(a) === 'SCHEDULED').length,
        expired: all.filter((a) => lifecycle(a) === 'EXPIRED').length,
        drafts: all.filter((a) => lifecycle(a) === 'DRAFT').length,
      },
      promotions: {
        activeOffers: offers.filter(
          (o) => o.isActive && (!o.startsAt || o.startsAt <= now) && (!o.endsAt || o.endsAt >= now),
        ).length,
        scheduledOffers: offers.filter((o) => o.isActive && o.startsAt && o.startsAt > now).length,
        expiredOffers: offers.filter((o) => o.endsAt && o.endsAt < now).length,
      },
      delivery: {
        status: delivery?.status ?? 'LIMITED_AREA',
        activeAreas: delivery?.areas ?? [],
        orderWindow: this.formatWindow(delivery?.orderStartTime, delivery?.orderEndTime),
        deliveryWindow: this.formatWindow(delivery?.deliveryStartTime, delivery?.deliveryEndTime),
      },
    };
  }

  listAnnouncements(all = false, type?: AnnouncementType) {
    return this.prisma.announcement
      .findMany({
        where: {
          ...(all ? {} : { isActive: true }),
          ...(type ? { type } : {}),
        },
        include: { analytics: true, promotionProduct: true },
        orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      })
      .then((items) => items.map((a) => this.mapAnnouncement(a)));
  }

  listPopups(all = true) {
    return this.listAnnouncements(all, AnnouncementType.POPUP);
  }

  async getAnnouncement(id: string) {
    const item = await this.prisma.announcement.findUnique({
      where: { id },
      include: { analytics: true, promotionProduct: true },
    });
    if (!item) throw new NotFoundException('Announcement not found');
    return this.mapAnnouncement(item);
  }

  async createAnnouncement(data: Prisma.AnnouncementCreateInput | Record<string, unknown>) {
    const normalized = this.normalizeInput(data);
    const created = await this.prisma.announcement.create({
      data: {
        ...(normalized as Prisma.AnnouncementCreateInput),
        analytics: { create: {} },
      },
      include: { analytics: true, promotionProduct: true },
    });
    this.bumpVersion();
    return this.mapAnnouncement(created);
  }

  async updateAnnouncement(
    id: string,
    data: Prisma.AnnouncementUpdateInput | Record<string, unknown>,
  ) {
    const normalized = this.normalizeInput(data);
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: normalized as Prisma.AnnouncementUpdateInput,
      include: { analytics: true, promotionProduct: true },
    });
    this.bumpVersion();
    return this.mapAnnouncement(updated);
  }

  async deleteAnnouncement(id: string) {
    await this.prisma.announcement.delete({ where: { id } });
    this.bumpVersion();
    return { ok: true };
  }

  async duplicateAnnouncement(id: string) {
    const source = await this.prisma.announcement.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Announcement not found');
    const { id: _id, createdAt, updatedAt, publishedAt, ...rest } = source;
    const created = await this.prisma.announcement.create({
      data: {
        ...rest,
        title: `${rest.title} (Copy)`,
        status: ContentStatus.DRAFT,
        isActive: false,
        publishedAt: null,
        analytics: { create: {} },
      },
      include: { analytics: true, promotionProduct: true },
    });
    return this.mapAnnouncement(created);
  }

  async togglePopup(id: string, isActive?: boolean) {
    const popup = await this.prisma.announcement.findUnique({ where: { id } });
    if (!popup || popup.type !== AnnouncementType.POPUP) {
      throw new NotFoundException('Popup not found');
    }

    const nextActive = typeof isActive === 'boolean' ? isActive : !popup.isActive;
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        isActive: nextActive,
        status: nextActive ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
        publishedAt: nextActive ? (popup.publishedAt ?? new Date()) : null,
      },
      include: { analytics: true, promotionProduct: true },
    });
    this.bumpVersion();
    return this.mapAnnouncement(updated);
  }

  async getPopupAnalytics(id: string) {
    const popup = await this.prisma.announcement.findFirst({
      where: { id, type: AnnouncementType.POPUP },
      include: { analytics: true },
    });
    if (!popup) throw new NotFoundException('Popup not found');

    const events = await this.prisma.announcementAnalyticsEvent.groupBy({
      by: ['eventType'],
      where: { announcementId: id },
      _count: { _all: true },
    });

    return {
      announcementId: id,
      analytics: popup.analytics
        ? {
            impressions: popup.analytics.impressions,
            views: popup.analytics.views,
            dismissals: popup.analytics.dismissals,
            ctaClicks: popup.analytics.ctaClicks,
            whatsappClicks: popup.analytics.whatsappClicks,
            orderClicks: popup.analytics.orderClicks,
            prebookClicks: popup.analytics.prebookClicks,
            conversions: popup.analytics.conversions,
            revenue: Number(popup.analytics.revenue),
            websiteViews: popup.analytics.websiteViews,
            androidViews: popup.analytics.androidViews,
            conversionRate:
              popup.analytics.impressions > 0
                ? Number(
                    ((popup.analytics.conversions / popup.analytics.impressions) * 100).toFixed(1),
                  )
                : 0,
          }
        : null,
      events: Object.fromEntries(events.map((event) => [event.eventType, event._count._all])),
    };
  }

  async publishAnnouncement(id: string) {
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        isActive: true,
        publishedAt: new Date(),
      },
      include: { analytics: true, promotionProduct: true },
    });
    this.bumpVersion();
    return this.mapAnnouncement(updated);
  }

  async getDeliveryConfigPublic() {
    const config = await this.getDeliveryConfig();
    return config ? this.mapDeliveryConfig(config) : null;
  }

  private async getDeliveryConfig() {
    return this.prisma.deliveryConfig.findFirst({ where: { isActive: true } });
  }

  async upsertDeliveryConfig(data: Record<string, unknown> | Prisma.DeliveryConfigUpdateInput) {
    const raw = data as Record<string, unknown>;
    const payload: Prisma.DeliveryConfigUpdateInput = {};
    const messageText = raw.message !== undefined ? String(raw.message || '') : undefined;
    const noDeliveryMsg =
      /pickup orders only|home delivery is not available|no home delivery|delivery is currently unavailable|delivery not available/i;
    let status = raw.status as DeliveryAvailabilityStatus | undefined;
    if (
      messageText !== undefined &&
      noDeliveryMsg.test(messageText) &&
      (status === 'AVAILABLE' || status === 'LIMITED_AREA' || status === undefined)
    ) {
      status = DeliveryAvailabilityStatus.TEMPORARILY_UNAVAILABLE;
    }

    if (status !== undefined) payload.status = status;
    if (Array.isArray(raw.areas)) payload.areas = raw.areas as string[];
    if (Array.isArray(raw.pincodes)) payload.pincodes = raw.pincodes as string[];
    if (raw.orderStartTime !== undefined)
      payload.orderStartTime = (raw.orderStartTime as string) || null;
    if (raw.orderEndTime !== undefined) payload.orderEndTime = (raw.orderEndTime as string) || null;
    if (raw.deliveryStartTime !== undefined)
      payload.deliveryStartTime = (raw.deliveryStartTime as string) || null;
    if (raw.deliveryEndTime !== undefined)
      payload.deliveryEndTime = (raw.deliveryEndTime as string) || null;
    if (raw.deliveryCharge !== undefined)
      payload.deliveryCharge = raw.deliveryCharge as number | null;
    if (raw.freeDeliveryThreshold !== undefined)
      payload.freeDeliveryThreshold = raw.freeDeliveryThreshold as number | null;
    if (raw.minOrderAmount !== undefined)
      payload.minOrderAmount = raw.minOrderAmount as number | null;
    if (raw.message !== undefined) payload.message = (raw.message as string) || null;
    if (raw.expansionMessage !== undefined)
      payload.expansionMessage = (raw.expansionMessage as string) || null;
    for (const key of [
      'trackingEnabled',
      'customerTrackingEnabled',
      'etaEnabled',
      'nearCustomerEnabled',
    ] as const) {
      if (typeof raw[key] === 'boolean') payload[key] = raw[key];
    }
    for (const key of [
      'locationUpdateIntervalSeconds',
      'locationMinDistanceMeters',
      'locationHistoryRetentionDays',
      'nearCustomerThresholdMeters',
    ] as const) {
      if (raw[key] !== undefined) {
        const value = Number(raw[key]);
        if (Number.isInteger(value) && value > 0) payload[key] = value;
      }
    }
    if (raw.deliveryRadiusKm !== undefined) {
      const value = Number(raw.deliveryRadiusKm);
      payload.deliveryRadiusKm = Number.isFinite(value) && value > 0 ? value : null;
    }
    if (raw.mapProvider !== undefined && typeof raw.mapProvider === 'string') {
      payload.mapProvider = raw.mapProvider.trim().toLowerCase() || 'google';
    }
    if (typeof raw.isActive === 'boolean') payload.isActive = raw.isActive;

    const existing = await this.prisma.deliveryConfig.findFirst();
    const saved = existing
      ? await this.prisma.deliveryConfig.update({ where: { id: existing.id }, data: payload })
      : await this.prisma.deliveryConfig.create({
          data: {
            status: status ?? DeliveryAvailabilityStatus.LIMITED_AREA,
            areas: Array.isArray(raw.areas) ? (raw.areas as string[]) : [],
            pincodes: Array.isArray(raw.pincodes) ? (raw.pincodes as string[]) : [],
            orderStartTime: (raw.orderStartTime as string) || null,
            orderEndTime: (raw.orderEndTime as string) || null,
            deliveryStartTime: (raw.deliveryStartTime as string) || null,
            deliveryEndTime: (raw.deliveryEndTime as string) || null,
            deliveryCharge: (raw.deliveryCharge as number) ?? null,
            freeDeliveryThreshold: (raw.freeDeliveryThreshold as number) ?? null,
            minOrderAmount: (raw.minOrderAmount as number) ?? null,
            message: (raw.message as string) || null,
            expansionMessage: (raw.expansionMessage as string) || null,
            trackingEnabled: raw.trackingEnabled !== false,
            customerTrackingEnabled: raw.customerTrackingEnabled !== false,
            deliveryRadiusKm: (raw.deliveryRadiusKm as number) ?? null,
            locationUpdateIntervalSeconds: Number(raw.locationUpdateIntervalSeconds) || 10,
            locationMinDistanceMeters: Number(raw.locationMinDistanceMeters) || 25,
            locationHistoryRetentionDays: Number(raw.locationHistoryRetentionDays) || 30,
            mapProvider: (raw.mapProvider as string) || 'google',
            etaEnabled: raw.etaEnabled !== false,
            nearCustomerEnabled: raw.nearCustomerEnabled === true,
            nearCustomerThresholdMeters: Number(raw.nearCustomerThresholdMeters) || 500,
            isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
          },
        });
    this.bumpVersion();
    return this.mapDeliveryConfig(saved);
  }

  private isDeliveryOffered(config: { status: string; message?: string | null }) {
    if (config.status === 'TEMPORARILY_UNAVAILABLE' || config.status === 'COMING_SOON') {
      return false;
    }
    if (config.status !== 'AVAILABLE' && config.status !== 'LIMITED_AREA') return false;
    if (
      config.message &&
      /pickup orders only|home delivery is not available|no home delivery|delivery is currently unavailable|delivery not available/i.test(
        config.message,
      )
    ) {
      return false;
    }
    return true;
  }

  async checkDeliveryArea(
    address: string,
    pincode?: string,
    coordinates?: { latitude?: number; longitude?: number },
  ) {
    const config = await this.getDeliveryConfig();
    if (!config) {
      return {
        available: false,
        matchedArea: null,
        status: 'TEMPORARILY_UNAVAILABLE' as const,
        message: 'Delivery information is currently unavailable.',
      };
    }

    if (!this.isDeliveryOffered(config)) {
      return {
        available: false,
        matchedArea: null,
        status:
          config.status === 'COMING_SOON'
            ? ('COMING_SOON' as const)
            : ('TEMPORARILY_UNAVAILABLE' as const),
        message: config.message ?? 'Pickup Orders Only — Home Delivery Is Not Available.',
        expansionMessage: config.expansionMessage,
      };
    }

    const restaurantLat = Number(process.env.RESTAURANT_LATITUDE);
    const restaurantLng = Number(process.env.RESTAURANT_LONGITUDE);
    const radiusKm = config.deliveryRadiusKm ? Number(config.deliveryRadiusKm) : null;
    if (
      radiusKm &&
      Number.isFinite(restaurantLat) &&
      Number.isFinite(restaurantLng) &&
      coordinates?.latitude != null &&
      coordinates.longitude != null
    ) {
      const distanceKm = haversineKm(
        restaurantLat,
        restaurantLng,
        coordinates.latitude,
        coordinates.longitude,
      );
      if (distanceKm > radiusKm) {
        return {
          available: false,
          matchedArea: null,
          status: config.status,
          message: 'We’re not delivering to this location yet.',
          expansionMessage:
            config.expansionMessage ??
            'We’re expanding our delivery service across Tura. Please check again soon.',
        };
      }
    }

    if (config.status === 'AVAILABLE') {
      return {
        available: true,
        matchedArea: 'All areas',
        status: config.status,
        message: config.message ?? 'Home delivery is available.',
        expansionMessage: config.expansionMessage,
        orderWindow: this.formatWindow(config.orderStartTime, config.orderEndTime),
        deliveryWindow: this.formatWindow(config.deliveryStartTime, config.deliveryEndTime),
      };
    }

    if (config.status === 'TEMPORARILY_UNAVAILABLE' || config.status === 'COMING_SOON') {
      return {
        available: false,
        matchedArea: null,
        status: config.status,
        message:
          config.message ??
          'Home delivery is currently unavailable. We are expanding our delivery service soon.',
        expansionMessage: config.expansionMessage,
      };
    }

    const resolvedPincode = this.extractPincode(address, pincode);
    const defaultTuraPincodes = ['794101', '794001', '794002'];
    const configuredPincodes = config.pincodes ?? [];
    const allowedPincodes =
      configuredPincodes.length > 0 ? configuredPincodes : defaultTuraPincodes;

    if (resolvedPincode && allowedPincodes.includes(resolvedPincode)) {
      return {
        available: true,
        matchedArea: resolvedPincode,
        status: config.status,
        message: config.message ?? `Home delivery is available for pincode ${resolvedPincode}.`,
        expansionMessage: config.expansionMessage,
        orderWindow: this.formatWindow(config.orderStartTime, config.orderEndTime),
        deliveryWindow: this.formatWindow(config.deliveryStartTime, config.deliveryEndTime),
      };
    }

    const matched = config.areas.find((area) => this.matchesDeliveryArea(address, area));

    return {
      available: Boolean(matched),
      matchedArea: matched ?? null,
      status: config.status,
      message: matched
        ? (config.message ?? `Home delivery is available in ${matched}.`)
        : resolvedPincode
          ? `Pincode ${resolvedPincode} is outside our current delivery zone. We deliver to ${config.areas.slice(0, 2).join(' and ')} (pincodes: ${allowedPincodes.join(', ')}).`
          : `We couldn't confirm delivery to this address. We currently deliver to ${config.areas.slice(0, 2).join(' and ')} — please include your area name or a valid pincode.`,
      expansionMessage: config.expansionMessage,
      orderWindow: matched
        ? this.formatWindow(config.orderStartTime, config.orderEndTime)
        : undefined,
      deliveryWindow: matched
        ? this.formatWindow(config.deliveryStartTime, config.deliveryEndTime)
        : undefined,
    };
  }

  private extractPincode(address: string, pincode?: string): string | null {
    const fromParam = pincode?.replace(/\D/g, '').slice(0, 6);
    if (fromParam?.length === 6) return fromParam;
    const fromText = address.match(/\b(\d{6})\b/)?.[1];
    return fromText ?? null;
  }

  private normalizeForAreaMatch(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private matchesDeliveryArea(address: string, area: string): boolean {
    const norm = this.normalizeForAreaMatch(address);
    const areaNorm = this.normalizeForAreaMatch(area);
    if (!norm || !areaNorm) return false;
    if (norm.includes(areaNorm) || areaNorm.includes(norm)) return true;

    const variants: Record<string, string[]> = {
      walbakgre: ['walbagre', 'walbakgre', 'walbakgrearea'],
      walbagre: ['walbakgre', 'walbagre'],
      holycrosshospitalarea: ['holycrosshospital', 'holycross', 'holycrosshospitalarea'],
      holycrosshospital: ['holycross', 'holy cross hospital', 'hospital area'],
    };

    const aliases = variants[areaNorm] ?? [];
    return aliases.some((alias) => norm.includes(this.normalizeForAreaMatch(alias)));
  }

  async trackEvent(body: {
    announcementId: string;
    event:
      | 'impression'
      | 'view'
      | 'dismiss'
      | 'close'
      | 'cta_click'
      | 'whatsapp_click'
      | 'order_click'
      | 'prebook_click'
      | 'conversion';
    platform: 'WEBSITE' | 'ANDROID';
    sessionId?: string;
    customerId?: string;
    revenue?: number;
    metadata?: Record<string, unknown>;
  }) {
    const eventType =
      body.event === 'dismiss'
        ? 'CLOSE'
        : body.event === 'impression'
          ? 'IMPRESSION'
          : body.event === 'view'
            ? 'VIEW'
            : body.event === 'cta_click'
              ? 'CTA_CLICK'
              : body.event === 'whatsapp_click'
                ? 'WHATSAPP_CLICK'
                : body.event === 'order_click'
                  ? 'ORDER_CLICK'
                  : body.event === 'prebook_click'
                    ? 'PREBOOK_CLICK'
                    : 'CONVERSION';

    const analytics = await this.prisma.announcementAnalytics.upsert({
      where: { announcementId: body.announcementId },
      create: { announcementId: body.announcementId },
      update: {},
    });

    const data: Prisma.AnnouncementAnalyticsUpdateInput = {};
    switch (body.event) {
      case 'impression':
        data.impressions = { increment: 1 };
        break;
      case 'view':
        data.views = { increment: 1 };
        if (body.platform === 'WEBSITE') data.websiteViews = { increment: 1 };
        if (body.platform === 'ANDROID') data.androidViews = { increment: 1 };
        break;
      case 'dismiss':
      case 'close':
        data.dismissals = { increment: 1 };
        break;
      case 'cta_click':
        data.ctaClicks = { increment: 1 };
        break;
      case 'whatsapp_click':
        data.whatsappClicks = { increment: 1 };
        break;
      case 'order_click':
        data.orderClicks = { increment: 1 };
        data.ctaClicks = { increment: 1 };
        break;
      case 'prebook_click':
        data.prebookClicks = { increment: 1 };
        data.ctaClicks = { increment: 1 };
        break;
      case 'conversion':
        data.conversions = { increment: 1 };
        if (body.revenue != null) data.revenue = { increment: body.revenue };
        break;
    }

    await this.prisma.$transaction([
      this.prisma.announcementAnalytics.update({
        where: { id: analytics.id },
        data,
      }),
      this.prisma.announcementAnalyticsEvent.create({
        data: {
          announcementId: body.announcementId,
          eventType,
          sessionId: body.sessionId ?? null,
          customerId: body.customerId ?? null,
          metadata: body.metadata ? (body.metadata as Prisma.InputJsonValue) : undefined,
        },
      }),
    ]);

    return { ok: true };
  }

  async recordDismissal(body: {
    announcementId: string;
    sessionId?: string;
    userId?: string;
    platform?: string;
  }) {
    if (!body.sessionId && !body.userId) return { ok: true };

    await this.prisma.announcementDismissal.upsert({
      where: {
        announcementId_sessionId: {
          announcementId: body.announcementId,
          sessionId: body.sessionId ?? `user-${body.userId}`,
        },
      },
      create: {
        announcementId: body.announcementId,
        sessionId: body.sessionId ?? `user-${body.userId}`,
        userId: body.userId,
        platform: body.platform ?? 'WEBSITE',
      },
      update: { dismissedAt: new Date() },
    });

    await this.trackEvent({
      announcementId: body.announcementId,
      event: 'dismiss',
      platform: (body.platform as 'WEBSITE' | 'ANDROID') ?? 'WEBSITE',
    });

    return { ok: true };
  }

  private async getActiveAnnouncements(platform: PlatformFilter) {
    const now = new Date();
    const platformFilter: Prisma.AnnouncementWhereInput =
      platform === 'WEBSITE'
        ? { platform: { in: [AnnouncementPlatform.WEBSITE, AnnouncementPlatform.BOTH] } }
        : { platform: { in: [AnnouncementPlatform.ANDROID, AnnouncementPlatform.BOTH] } };

    const items = await this.prisma.announcement.findMany({
      where: {
        isActive: true,
        status: ContentStatus.PUBLISHED,
        ...platformFilter,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          {
            OR: [
              { promotionProductId: null },
              platform === 'WEBSITE'
                ? { promotionWebsiteEnabled: true }
                : { promotionAndroidEnabled: true },
            ],
          },
        ],
      },
      include: { analytics: true, promotionProduct: true },
      orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return items.filter((a) => this.isWithinDailyWindow(a.dailyStartTime, a.dailyEndTime, now));
  }

  private isWithinDailyWindow(start?: string | null, end?: string | null, now = new Date()) {
    if (!start || !end) return true;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (startMins <= endMins) return mins >= startMins && mins <= endMins;
    return mins >= startMins || mins <= endMins;
  }

  private computeLifecycle(
    a: { status: ContentStatus; startsAt: Date | null; endsAt: Date | null; isActive: boolean },
    now: Date,
  ) {
    if (a.status === ContentStatus.DRAFT || !a.isActive) return 'DRAFT';
    if (a.startsAt && a.startsAt > now) return 'SCHEDULED';
    if (a.endsAt && a.endsAt < now) return 'EXPIRED';
    return 'ACTIVE';
  }

  private comparePriority(
    a: { priorityLevel: string; priority: number },
    b: { priorityLevel: string; priority: number },
  ) {
    const aw = PRIORITY_WEIGHT[a.priorityLevel] ?? 0;
    const bw = PRIORITY_WEIGHT[b.priorityLevel] ?? 0;
    if (aw !== bw) return bw - aw;
    return b.priority - a.priority;
  }

  private formatWindow(start?: string | null, end?: string | null) {
    if (!start || !end) return null;
    return `${this.formatTime12(start)} – ${this.formatTime12(end)}`;
  }

  private formatTime12(time: string) {
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  private async getPromotionRemainingQuantity(
    productId: string,
    dateKey: string,
    quantityLimit: number,
  ) {
    const start = new Date(`${dateKey}T00:00:00+05:30`);
    const end = new Date(`${dateKey}T00:00:00+05:30`);
    end.setUTCDate(end.getUTCDate() + 1);
    const booked = await this.prisma.orderItem.aggregate({
      where: {
        productId,
        order: {
          status: { not: OrderStatus.CANCELLED },
          scheduledDeliveryAt: { gte: start, lt: end },
        },
      },
      _sum: { quantity: true },
    });
    return Math.max(0, quantityLimit - (booked._sum.quantity ?? 0));
  }

  private normalizeInput(data: Prisma.AnnouncementCreateInput | Record<string, unknown>) {
    const result = { ...(data as Record<string, unknown>) };
    if (!result.type && result.popupType) result.type = AnnouncementType.POPUP;
    if (result.type === AnnouncementType.POPUP || result.popupType) {
      result.type = AnnouncementType.POPUP;
      result.placements = ['POPUP'];
      if (typeof result.isActive === 'boolean' && result.status === undefined) {
        result.status = result.isActive ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
      }
      if (result.priority !== undefined) {
        const priority = Number(result.priority);
        result.priority = Number.isFinite(priority) ? Math.min(10, Math.max(1, priority)) : 1;
      }
    }
    if (typeof result.startsAt === 'string') result.startsAt = new Date(result.startsAt);
    if (typeof result.endsAt === 'string') result.endsAt = new Date(result.endsAt);
    if (typeof result.publishedAt === 'string') result.publishedAt = new Date(result.publishedAt);
    if (
      result.startsAt instanceof Date &&
      result.endsAt instanceof Date &&
      result.endsAt <= result.startsAt
    ) {
      throw new BadRequestException('Popup end date must be after its start date');
    }
    return result;
  }

  private bumpVersion() {
    this.configVersion += 1;
    void this.prisma.mobileAppConfig.findFirst().then((config) =>
      config
        ? this.prisma.mobileAppConfig.update({
            where: { id: config.id },
            data: { configVersion: { increment: 1 } },
          })
        : null,
    );
  }

  private mapAnnouncement(a: {
    id: string;
    title: string;
    message: string;
    shortMessage?: string | null;
    type: string;
    linkUrl?: string | null;
    icon?: string | null;
    bannerImageUrl?: string | null;
    heroBannerImageUrl?: string | null;
    ctaText?: string | null;
    ctaUrl?: string | null;
    dailyStartTime?: string | null;
    dailyEndTime?: string | null;
    status: ContentStatus;
    priorityLevel: string;
    priority: number;
    sortOrder: number;
    dismissible: boolean;
    mandatory: boolean;
    platform: string;
    placements: string[];
    orderTypes: string[];
    popupFrequency?: string | null;
    popupType?: string | null;
    headline?: string | null;
    subheadline?: string | null;
    price?: string | null;
    availability?: string | null;
    ctaType?: string | null;
    ctaMessage?: string | null;
    imageOnly: boolean;
    closeOnOverlay: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
    publishedAt?: Date | null;
    promotionProductId?: string | null;
    promotionProduct?: {
      id: string;
      name: string;
      slug: string;
      price: Prisma.Decimal;
      imageUrl: string | null;
      description: string | null;
      ingredients: string | null;
      isAvailable: boolean;
      isPreOrder: boolean;
    } | null;
    promotionDayOfWeek?: number | null;
    promotionReadyTime?: string | null;
    promotionPreOrderRequired: boolean;
    promotionPreOrderCutoffDay?: number | null;
    promotionQuantityLimit?: number | null;
    promotionWebsiteEnabled: boolean;
    promotionAndroidEnabled: boolean;
    isActive: boolean;
    analytics?: {
      impressions: number;
      views: number;
      dismissals: number;
      ctaClicks: number;
      whatsappClicks: number;
      orderClicks: number;
      prebookClicks: number;
      conversions: number;
      revenue: Prisma.Decimal;
      websiteViews: number;
      androidViews: number;
    } | null;
  }) {
    const now = new Date();
    const promotionSchedule =
      a.promotionDayOfWeek != null && a.promotionReadyTime
        ? nextPromotionDate({
            dayOfWeek: a.promotionDayOfWeek,
            preOrderRequired: a.promotionPreOrderRequired,
            preOrderCutoffDay: a.promotionPreOrderCutoffDay,
          })
        : null;
    return {
      id: a.id,
      title: a.title,
      message: a.message,
      shortMessage: a.shortMessage,
      type: a.type,
      linkUrl: a.linkUrl,
      icon: a.icon,
      bannerImageUrl: a.bannerImageUrl,
      heroBannerImageUrl: a.heroBannerImageUrl,
      ctaText: a.ctaText,
      ctaUrl: a.ctaUrl,
      dailyStartTime: a.dailyStartTime,
      dailyEndTime: a.dailyEndTime,
      status: a.status,
      priorityLevel: a.priorityLevel,
      priority: a.priority,
      sortOrder: a.sortOrder,
      dismissible: a.dismissible,
      mandatory: a.mandatory,
      platform: a.platform,
      placements: a.placements,
      orderTypes: a.orderTypes,
      popupFrequency: a.popupFrequency,
      popupType: a.popupType,
      headline: a.headline,
      subheadline: a.subheadline,
      price: a.price,
      availability: a.availability,
      ctaType: a.ctaType,
      ctaMessage: a.ctaMessage,
      imageOnly: a.imageOnly,
      closeOnOverlay: a.closeOnOverlay,
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      promotionProductId: a.promotionProductId ?? null,
      promotionProduct: a.promotionProduct
        ? {
            id: a.promotionProduct.id,
            name: a.promotionProduct.name,
            slug: a.promotionProduct.slug,
            price: Number(a.promotionProduct.price),
            imageUrl: a.promotionProduct.imageUrl,
            description: a.promotionProduct.description,
            ingredients: a.promotionProduct.ingredients,
            isAvailable: a.promotionProduct.isAvailable,
            isPreOrder: a.promotionProduct.isPreOrder,
          }
        : null,
      promotionDayOfWeek: a.promotionDayOfWeek ?? null,
      promotionReadyTime: a.promotionReadyTime ?? null,
      promotionPreOrderRequired: a.promotionPreOrderRequired,
      promotionPreOrderCutoffDay: a.promotionPreOrderCutoffDay ?? null,
      promotionQuantityLimit: a.promotionQuantityLimit ?? null,
      promotionWebsiteEnabled: a.promotionWebsiteEnabled,
      promotionAndroidEnabled: a.promotionAndroidEnabled,
      promotionNextAvailableDate: promotionSchedule?.date ?? null,
      promotionNextAvailableLabel: promotionSchedule?.label ?? null,
      isActive: a.isActive,
      lifecycle: this.computeLifecycle(
        {
          status: a.status,
          startsAt: a.startsAt ?? null,
          endsAt: a.endsAt ?? null,
          isActive: a.isActive,
        },
        now,
      ),
      analytics: a.analytics
        ? {
            impressions: a.analytics.impressions,
            views: a.analytics.views,
            dismissals: a.analytics.dismissals,
            ctaClicks: a.analytics.ctaClicks,
            whatsappClicks: a.analytics.whatsappClicks,
            orderClicks: a.analytics.orderClicks,
            prebookClicks: a.analytics.prebookClicks,
            conversions: a.analytics.conversions,
            revenue: Number(a.analytics.revenue),
            websiteViews: a.analytics.websiteViews,
            androidViews: a.analytics.androidViews,
            conversionRate:
              a.analytics.impressions > 0
                ? Number(((a.analytics.conversions / a.analytics.impressions) * 100).toFixed(1))
                : 0,
          }
        : undefined,
    };
  }

  private mapDeliveryConfig(c: {
    id: string;
    status: string;
    areas: string[];
    pincodes?: string[];
    orderStartTime?: string | null;
    orderEndTime?: string | null;
    deliveryStartTime?: string | null;
    deliveryEndTime?: string | null;
    deliveryCharge?: Prisma.Decimal | null;
    freeDeliveryThreshold?: Prisma.Decimal | null;
    minOrderAmount?: Prisma.Decimal | null;
    message?: string | null;
    expansionMessage?: string | null;
    trackingEnabled: boolean;
    customerTrackingEnabled: boolean;
    deliveryRadiusKm?: Prisma.Decimal | null;
    locationUpdateIntervalSeconds: number;
    locationMinDistanceMeters: number;
    locationHistoryRetentionDays: number;
    mapProvider: string;
    etaEnabled: boolean;
    nearCustomerEnabled: boolean;
    nearCustomerThresholdMeters: number;
    isActive: boolean;
  }) {
    return {
      id: c.id,
      status: c.status,
      areas: c.areas,
      pincodes: c.pincodes ?? [],
      orderStartTime: c.orderStartTime,
      orderEndTime: c.orderEndTime,
      deliveryStartTime: c.deliveryStartTime,
      deliveryEndTime: c.deliveryEndTime,
      deliveryCharge: c.deliveryCharge ? Number(c.deliveryCharge) : null,
      freeDeliveryThreshold: c.freeDeliveryThreshold ? Number(c.freeDeliveryThreshold) : null,
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      message: c.message,
      expansionMessage: c.expansionMessage,
      trackingEnabled: c.trackingEnabled,
      customerTrackingEnabled: c.customerTrackingEnabled,
      deliveryRadiusKm: c.deliveryRadiusKm ? Number(c.deliveryRadiusKm) : null,
      locationUpdateIntervalSeconds: c.locationUpdateIntervalSeconds,
      locationMinDistanceMeters: c.locationMinDistanceMeters,
      locationHistoryRetentionDays: c.locationHistoryRetentionDays,
      mapProvider: c.mapProvider,
      etaEnabled: c.etaEnabled,
      nearCustomerEnabled: c.nearCustomerEnabled,
      nearCustomerThresholdMeters: c.nearCustomerThresholdMeters,
      isActive: c.isActive,
      orderWindow: this.formatWindow(c.orderStartTime, c.orderEndTime),
      deliveryWindow: this.formatWindow(c.deliveryStartTime, c.deliveryEndTime),
    };
  }
}
