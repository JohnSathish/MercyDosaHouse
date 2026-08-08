export type CategoryStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'INACTIVE' | 'SEASONAL';

export type CategoryBadge = 'NEW' | 'HOT' | 'BEST_SELLER' | 'LIMITED' | 'SPICY' | 'VEG' | 'NON_VEG';

export type CategoryViewMode = 'card' | 'table' | 'kanban';

export interface CategoryScheduleDto {
  id?: string;
  label: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface CategoryAnalyticsDto {
  views: number;
  orders: number;
  revenue: number;
  conversion: number;
  popularity: number;
}

export interface AdminCategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  bannerUrl?: string | null;
  thumbnailUrl?: string | null;
  mobileImageUrl?: string | null;
  cardImageUrl?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  sortOrder: number;
  isActive: boolean;
  status: CategoryStatus;
  badge?: CategoryBadge | null;
  isFeatured: boolean;
  isPopular: boolean;
  isSeasonal: boolean;
  seasonalName?: string | null;
  seasonalStart?: string | null;
  seasonalEnd?: string | null;
  showOnHome: boolean;
  showInMobileApp: boolean;
  showInOffers: boolean;
  allowOrdering: boolean;
  showOnWebsite: boolean;
  showOnPos: boolean;
  showOnDelivery: boolean;
  showOnQrMenu: boolean;
  gstPercent?: number | null;
  prepTimeMinutes: number;
  servingTimeMinutes: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  itemCount: number;
  availableItems: number;
  unavailableItems: number;
  schedules: CategoryScheduleDto[];
  tags: string[];
  analytics: CategoryAnalyticsDto;
  topSellingItem?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDashboardDto {
  stats: {
    totalCategories: number;
    active: number;
    inactive: number;
    menuItems: number;
    bestSellingCategory: string;
    revenueThisMonth: number;
  };
  widgets: {
    popular: AdminCategoryDto[];
    leastSelling: AdminCategoryDto[];
    recentlyUpdated: AdminCategoryDto[];
    inactiveCategories: AdminCategoryDto[];
    revenueByCategory: { name: string; revenue: number; orders: number }[];
  };
  categories: AdminCategoryDto[];
}

export interface CategoryInsightDto {
  id: string;
  type: string;
  message: string;
  suggestion: string;
  severity: 'positive' | 'warning' | 'info';
}

export interface CategoryLogDto {
  id: string;
  action: string;
  description: string;
  createdAt: string;
}
