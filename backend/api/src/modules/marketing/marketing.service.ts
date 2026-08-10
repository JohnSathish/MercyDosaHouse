import { Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementPlatform, ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PRIORITY_WEIGHT: Record<string, number> = {
  EMERGENCY: 100,
  DELIVERY_UPDATE: 80,
  IMPORTANT_NOTICE: 60,
  PROMOTION: 40,
  GENERAL: 20,
};

type PlatformFilter = 'WEBSITE' | 'ANDROID';

@Injectable()
export class MarketingService {
  private configVersion = 1;

  constructor(private prisma: PrismaService) {}

  async getPublicBundle(platform: PlatformFilter = 'WEBSITE') {
    const [announcements, delivery] = await Promise.all([
      this.getActiveAnnouncements(platform),
      this.getDeliveryConfig(),
    ]);

    const mapped = announcements.map((a) => this.mapAnnouncement(a));
    const byPlacement: Record<string, typeof mapped> = {};

    for (const item of mapped) {
      for (const placement of item.placements) {
        if (!byPlacement[placement]) byPlacement[placement] = [];
        byPlacement[placement].push(item);
      }
    }

    for (const key of Object.keys(byPlacement)) {
      byPlacement[key].sort((a, b) => this.comparePriority(a, b));
      byPlacement[key] = [byPlacement[key][0]!];
    }

    return {
      version: this.configVersion,
      updatedAt: new Date().toISOString(),
      announcements: mapped,
      byPlacement,
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

  listAnnouncements(all = false) {
    return this.prisma.announcement
      .findMany({
        where: all ? undefined : { isActive: true },
        include: { analytics: true },
        orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      })
      .then((items) => items.map((a) => this.mapAnnouncement(a)));
  }

  async getAnnouncement(id: string) {
    const item = await this.prisma.announcement.findUnique({
      where: { id },
      include: { analytics: true },
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
      include: { analytics: true },
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
      include: { analytics: true },
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
      include: { analytics: true },
    });
    return this.mapAnnouncement(created);
  }

  async publishAnnouncement(id: string) {
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        isActive: true,
        publishedAt: new Date(),
      },
      include: { analytics: true },
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

  async upsertDeliveryConfig(data: Prisma.DeliveryConfigUpdateInput) {
    const existing = await this.prisma.deliveryConfig.findFirst();
    const saved = existing
      ? await this.prisma.deliveryConfig.update({ where: { id: existing.id }, data })
      : await this.prisma.deliveryConfig.create({ data: data as Prisma.DeliveryConfigCreateInput });
    this.bumpVersion();
    return this.mapDeliveryConfig(saved);
  }

  async checkDeliveryArea(address: string) {
    const config = await this.getDeliveryConfig();
    if (!config) {
      return {
        available: false,
        matchedArea: null,
        status: 'TEMPORARILY_UNAVAILABLE' as const,
        message: 'Delivery information is currently unavailable.',
      };
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

    const normalized = address.toLowerCase();
    const matched = config.areas.find((area) => normalized.includes(area.toLowerCase()));

    return {
      available: Boolean(matched),
      matchedArea: matched ?? null,
      status: config.status,
      message: matched
        ? (config.message ?? `Home delivery is available in ${matched}.`)
        : (config.message ??
          'Home delivery is currently unavailable in your area. We are expanding our delivery service across Tura soon.'),
      expansionMessage: config.expansionMessage,
      orderWindow: this.formatWindow(config.orderStartTime, config.orderEndTime),
      deliveryWindow: this.formatWindow(config.deliveryStartTime, config.deliveryEndTime),
    };
  }

  async trackEvent(body: {
    announcementId: string;
    event: 'impression' | 'view' | 'dismiss' | 'cta_click' | 'conversion';
    platform: 'WEBSITE' | 'ANDROID';
    revenue?: number;
  }) {
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
        data.dismissals = { increment: 1 };
        break;
      case 'cta_click':
        data.ctaClicks = { increment: 1 };
        break;
      case 'conversion':
        data.conversions = { increment: 1 };
        if (body.revenue) data.revenue = { increment: body.revenue };
        break;
    }

    await this.prisma.announcementAnalytics.update({
      where: { id: analytics.id },
      data,
    });

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
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { analytics: true },
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

  private normalizeInput(data: Prisma.AnnouncementCreateInput | Record<string, unknown>) {
    const result = { ...(data as Record<string, unknown>) };
    if (typeof result.startsAt === 'string') result.startsAt = new Date(result.startsAt);
    if (typeof result.endsAt === 'string') result.endsAt = new Date(result.endsAt);
    if (typeof result.publishedAt === 'string') result.publishedAt = new Date(result.publishedAt);
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
    startsAt?: Date | null;
    endsAt?: Date | null;
    publishedAt?: Date | null;
    isActive: boolean;
    analytics?: {
      impressions: number;
      views: number;
      dismissals: number;
      ctaClicks: number;
      conversions: number;
      revenue: Prisma.Decimal;
      websiteViews: number;
      androidViews: number;
    } | null;
  }) {
    const now = new Date();
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
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
      publishedAt: a.publishedAt?.toISOString() ?? null,
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
            conversions: a.analytics.conversions,
            revenue: Number(a.analytics.revenue),
            websiteViews: a.analytics.websiteViews,
            androidViews: a.analytics.androidViews,
          }
        : undefined,
    };
  }

  private mapDeliveryConfig(c: {
    id: string;
    status: string;
    areas: string[];
    orderStartTime?: string | null;
    orderEndTime?: string | null;
    deliveryStartTime?: string | null;
    deliveryEndTime?: string | null;
    deliveryCharge?: Prisma.Decimal | null;
    freeDeliveryThreshold?: Prisma.Decimal | null;
    minOrderAmount?: Prisma.Decimal | null;
    message?: string | null;
    expansionMessage?: string | null;
    isActive: boolean;
  }) {
    return {
      id: c.id,
      status: c.status,
      areas: c.areas,
      orderStartTime: c.orderStartTime,
      orderEndTime: c.orderEndTime,
      deliveryStartTime: c.deliveryStartTime,
      deliveryEndTime: c.deliveryEndTime,
      deliveryCharge: c.deliveryCharge ? Number(c.deliveryCharge) : null,
      freeDeliveryThreshold: c.freeDeliveryThreshold ? Number(c.freeDeliveryThreshold) : null,
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      message: c.message,
      expansionMessage: c.expansionMessage,
      isActive: c.isActive,
      orderWindow: this.formatWindow(c.orderStartTime, c.orderEndTime),
      deliveryWindow: this.formatWindow(c.deliveryStartTime, c.deliveryEndTime),
    };
  }
}
