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

const NO_DELIVERY_MESSAGE_RE =
  /pickup orders only|home delivery is not available|no home delivery|delivery is currently unavailable|delivery not available/i;

/** True when home delivery should be offered (areas/windows shown, checkout allows delivery). */
export function isHomeDeliveryActive(
  delivery?: Pick<DeliveryConfigDto, 'status' | 'message'> | null,
): boolean {
  if (!delivery) return false;
  const status = delivery.status ?? 'LIMITED_AREA';
  if (status === 'TEMPORARILY_UNAVAILABLE' || status === 'COMING_SOON') return false;
  if (status !== 'AVAILABLE' && status !== 'LIMITED_AREA') return false;
  if (delivery.message && NO_DELIVERY_MESSAGE_RE.test(delivery.message)) return false;
  return true;
}

/** Normalize admin payload when message says pickup-only but status is still Available. */
export function normalizeDeliveryConfigInput<
  T extends { status?: DeliveryAvailabilityStatus; message?: string | null },
>(data: T): T {
  const message = data.message?.trim() || null;
  let status = data.status;
  if (
    message &&
    NO_DELIVERY_MESSAGE_RE.test(message) &&
    (status === 'AVAILABLE' || status === 'LIMITED_AREA' || status == null)
  ) {
    status = 'TEMPORARILY_UNAVAILABLE';
  }
  return { ...data, status, message };
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
