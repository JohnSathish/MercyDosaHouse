export type MobileHomeSectionKey =
  | 'hero_banner'
  | 'promotional_banners'
  | 'categories'
  | 'todays_offers'
  | 'featured_items'
  | 'popular_items'
  | 'recommended_items'
  | 'recently_ordered'
  | 'combos'
  | 'new_arrivals'
  | 'festival_specials'
  | 'best_sellers';

export interface MobileHomeSectionDto {
  id: string;
  sectionKey: MobileHomeSectionKey | string;
  title?: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
}

export interface MobileBrandingDto {
  appName: string;
  tagline: string;
  logoUrl?: string | null;
  splashLogoUrl?: string | null;
  splashBackgroundColor: string;
  splashBackgroundImageUrl?: string | null;
  appIconUrl?: string | null;
}

export interface MobileThemeDto {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  darkModeDefault: boolean;
  allowDarkMode: boolean;
  allowLightMode: boolean;
}

export interface MobileFeatureFlagDto {
  id?: string;
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  platform: string;
  sortOrder?: number;
}

export interface MobileVersionControlDto {
  minAppVersion: string;
  latestAppVersion: string;
  forceUpdate: boolean;
  softUpdateMessage?: string | null;
}

export interface MobileStoreStatusDto {
  storeOpen: boolean;
  storeClosedMessage?: string | null;
  storeReopenMessage?: string | null;
  emergencyNotice?: string | null;
  openingHours?: string | null;
  deliveryHours?: string | null;
}

export interface MobileMaintenanceDto {
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  maintenanceEndsAt?: string | null;
}

export interface MobileDeliverySettingsDto {
  deliveryCharge: number;
  packingCharge: number;
  minOrderAmount: number;
  freeDeliveryLimit: number;
  deliveryRadiusKm: number;
  estimatedDeliveryMinutes: number;
  preOrderDiscountPct: number;
  preOrderMinDaysAhead: number;
  preOrderStackWithCoupons: boolean;
}

export interface MobilePaymentMethodDto {
  method: string;
  isEnabled: boolean;
  config?: Record<string, unknown> | null;
}

export interface MobileAppConfigDto {
  configVersion: number;
  updatedAt: string;
  refreshIntervalSeconds: number;
  apiBaseUrl?: string | null;
  branding: MobileBrandingDto;
  theme: MobileThemeDto;
  maintenance: MobileMaintenanceDto;
  versionControl: MobileVersionControlDto;
  store: MobileStoreStatusDto;
  delivery: MobileDeliverySettingsDto;
  business: {
    businessName: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
    upiId?: string | null;
  };
  homepage: MobileHomeSectionDto[];
  announcements: import('./cms').AnnouncementDto[];
  offers: import('./cms').OfferDto[];
  banners: import('./index').BannerDto[];
  navigation: import('./cms').NavigationItemDto[];
  featureFlags: Record<string, boolean>;
  paymentMethods: MobilePaymentMethodDto[];
  help: {
    faqs: import('./cms').FaqDto[];
    whatsapp?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  marketing?: import('./marketing').MarketingPublicBundleDto;
}

export interface MobileConfigVersionDto {
  configVersion: number;
  updatedAt: string;
}

export const DEFAULT_MOBILE_HOME_SECTIONS: {
  sectionKey: MobileHomeSectionKey;
  title: string;
  sortOrder: number;
}[] = [
  { sectionKey: 'hero_banner', title: 'Hero Banner Slider', sortOrder: 1 },
  { sectionKey: 'promotional_banners', title: 'Promotional Banners', sortOrder: 2 },
  { sectionKey: 'categories', title: 'Categories', sortOrder: 3 },
  { sectionKey: 'todays_offers', title: "Today's Offers", sortOrder: 4 },
  { sectionKey: 'featured_items', title: 'Featured Items', sortOrder: 5 },
  { sectionKey: 'popular_items', title: 'Popular Items', sortOrder: 6 },
  { sectionKey: 'recommended_items', title: 'Recommended Items', sortOrder: 7 },
  { sectionKey: 'recently_ordered', title: 'Recently Ordered', sortOrder: 8 },
  { sectionKey: 'combos', title: 'Combos', sortOrder: 9 },
  { sectionKey: 'new_arrivals', title: 'New Arrivals', sortOrder: 10 },
  { sectionKey: 'festival_specials', title: 'Festival Specials', sortOrder: 11 },
  { sectionKey: 'best_sellers', title: 'Best Sellers', sortOrder: 12 },
];

export const DEFAULT_MOBILE_FEATURE_FLAGS: {
  key: string;
  label: string;
  description: string;
  sortOrder: number;
}[] = [
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Allow customers to write reviews',
    sortOrder: 1,
  },
  { key: 'ratings', label: 'Ratings', description: 'Show product ratings', sortOrder: 2 },
  { key: 'wishlist', label: 'Wishlist', description: 'Save favorite items', sortOrder: 3 },
  {
    key: 'loyalty',
    label: 'Loyalty Program',
    description: 'Reward points and tiers',
    sortOrder: 4,
  },
  { key: 'referral', label: 'Referral', description: 'Refer-a-friend rewards', sortOrder: 5 },
  { key: 'coupons', label: 'Coupons', description: 'Apply coupon codes at checkout', sortOrder: 6 },
  {
    key: 'scheduled_orders',
    label: 'Scheduled Orders',
    description: 'Schedule delivery date/time',
    sortOrder: 7,
  },
  {
    key: 'pre_order_discount',
    label: 'Pre-Order Discount',
    description: '10% off advance orders',
    sortOrder: 8,
  },
  {
    key: 'live_tracking',
    label: 'Live Tracking',
    description: 'Real-time delivery tracking',
    sortOrder: 9,
  },
  {
    key: 'whatsapp_support',
    label: 'WhatsApp Support',
    description: 'Contact via WhatsApp',
    sortOrder: 10,
  },
  { key: 'chat', label: 'Live Chat', description: 'In-app chat support', sortOrder: 11 },
  {
    key: 'push_notifications',
    label: 'Push Notifications',
    description: 'FCM push alerts',
    sortOrder: 12,
  },
  { key: 'google_login', label: 'Google Login', description: 'Sign in with Google', sortOrder: 13 },
  {
    key: 'guest_checkout',
    label: 'Guest Checkout',
    description: 'Order without account',
    sortOrder: 14,
  },
];
