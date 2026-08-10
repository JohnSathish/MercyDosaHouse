export type AnnouncementPriorityLevel =
  'EMERGENCY' | 'DELIVERY_UPDATE' | 'IMPORTANT_NOTICE' | 'PROMOTION' | 'GENERAL';

export type AnnouncementPlatform = 'WEBSITE' | 'ANDROID' | 'BOTH';

export type AnnouncementPlacement =
  | 'TOP_BAR'
  | 'HERO_SECTION'
  | 'DELIVERY_CARD'
  | 'POPUP'
  | 'CHECKOUT'
  | 'APP_HOME'
  | 'ORDER_TRACKING'
  | 'HOME_BOLD_BANNER';

export type PopupFrequency = 'ONCE_SESSION' | 'ONCE_DAY' | 'EVERY_VISIT';

export type DeliveryAvailabilityStatus =
  'AVAILABLE' | 'LIMITED_AREA' | 'TEMPORARILY_UNAVAILABLE' | 'COMING_SOON';

export type AnnouncementLifecycle = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';

export interface AnnouncementAnalyticsDto {
  impressions: number;
  views: number;
  dismissals: number;
  ctaClicks: number;
  conversions: number;
  revenue: number;
  websiteViews: number;
  androidViews: number;
}

export interface MarketingAnnouncementDto {
  id: string;
  title: string;
  message: string;
  shortMessage?: string | null;
  type: 'BAR' | 'POPUP';
  linkUrl?: string | null;
  icon?: string | null;
  bannerImageUrl?: string | null;
  heroBannerImageUrl?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  priorityLevel: AnnouncementPriorityLevel;
  priority: number;
  sortOrder: number;
  dismissible: boolean;
  mandatory: boolean;
  platform: AnnouncementPlatform;
  placements: AnnouncementPlacement[];
  orderTypes: string[];
  popupFrequency?: PopupFrequency | null;
  startsAt?: string | null;
  endsAt?: string | null;
  publishedAt?: string | null;
  isActive: boolean;
  lifecycle?: AnnouncementLifecycle;
  analytics?: AnnouncementAnalyticsDto;
}

export interface DeliveryConfigDto {
  id: string;
  status: DeliveryAvailabilityStatus;
  areas: string[];
  orderStartTime?: string | null;
  orderEndTime?: string | null;
  deliveryStartTime?: string | null;
  deliveryEndTime?: string | null;
  orderWindow?: string | null;
  deliveryWindow?: string | null;
  deliveryCharge?: number | null;
  freeDeliveryThreshold?: number | null;
  minOrderAmount?: number | null;
  message?: string | null;
  expansionMessage?: string | null;
  isActive: boolean;
}

export interface MarketingPublicBundleDto {
  version: number;
  updatedAt: string;
  announcements: MarketingAnnouncementDto[];
  byPlacement: Partial<Record<AnnouncementPlacement, MarketingAnnouncementDto[]>>;
  delivery: DeliveryConfigDto | null;
}

export interface MarketingDashboardDto {
  announcements: {
    active: number;
    scheduled: number;
    expired: number;
    drafts: number;
  };
  promotions: {
    activeOffers: number;
    scheduledOffers: number;
    expiredOffers: number;
  };
  delivery: {
    status: DeliveryAvailabilityStatus;
    activeAreas: string[];
    orderWindow: string | null;
    deliveryWindow: string | null;
  };
}

export interface DeliveryAreaCheckDto {
  available: boolean;
  matchedArea?: string | null;
  status: DeliveryAvailabilityStatus;
  message: string;
  expansionMessage?: string | null;
  orderWindow?: string | null;
  deliveryWindow?: string | null;
}

export interface TrackAnnouncementEventDto {
  announcementId: string;
  event: 'impression' | 'view' | 'dismiss' | 'cta_click' | 'conversion';
  platform: 'WEBSITE' | 'ANDROID';
  sessionId?: string;
  revenue?: number;
}
