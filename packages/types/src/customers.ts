export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export type CustomerFilter =
  'all' | 'vip' | 'regular' | 'inactive' | 'blocked' | 'new' | 'repeat' | 'birthday';

export interface CustomerListItemDto {
  id: string;
  customerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  totalOrders: number;
  totalSpent: number;
  rewardPoints: number;
  loyaltyTier: LoyaltyTier;
  customerType: string;
  lastOrderAt?: string | null;
  status: string;
  tags: string[];
  isRepeat: boolean;
  isVip: boolean;
  isInactive: boolean;
  createdAt: string;
  dateOfBirth?: string | null;
}

export interface CustomerStatsDto {
  totalCustomers: number;
  newToday: number;
  repeatCustomers: number;
  vipCustomers: number;
  inactiveCustomers: number;
  avgOrderValue: number;
  lifetimeRevenue: number;
}

export interface CustomerGrowthPointDto {
  month: string;
  newCustomers: number;
  repeatCustomers: number;
  revenue: number;
}

export interface CustomerDashboardDto {
  stats: CustomerStatsDto;
  growth: CustomerGrowthPointDto[];
  topSpenders: Array<{ id: string; name: string; totalSpent: number }>;
  recentRegistrations: Array<{ id: string; name: string; createdAt: string }>;
  birthdaysToday: Array<{ id: string; name: string; phone: string | null }>;
  pendingReviews: number;
}

export interface CustomerDetailDto extends CustomerListItemDto {
  registeredDate: string;
  preferredPayment?: string | null;
  preferredDelivery?: string | null;
  avgOrderValue: number;
  adminNotes?: string | null;
  addresses: unknown[];
  orders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    items: Array<{ productName: string; quantity: number }>;
    grandTotal: number;
    paymentMethod: string;
    status: string;
    deliveryAddress: string;
  }>;
  favorites: Array<{ id: string; name: string; imageUrl?: string | null; orderCount: number }>;
  reviews: Array<{
    id: string;
    productName: string;
    rating: number;
    comment?: string | null;
    ownerReply?: string | null;
    createdAt: string;
  }>;
  coupons: Array<{
    id: string;
    code: string;
    type: string;
    value: number;
    expiresAt?: string | null;
    usedAt?: string | null;
    status: string;
  }>;
  notes: Array<{ id: string; content: string; createdAt: string }>;
  rewards: {
    current: number;
    totalEarned: number;
    totalRedeemed: number;
    available: number;
    transactions: Array<{
      id: string;
      points: number;
      balance: number;
      type: string;
      description?: string | null;
      createdAt: string;
    }>;
  };
  timeline: Array<{ type: string; description: string; createdAt: string }>;
  loyaltyProgress: { tier: LoyaltyTier; orderCount: number; nextTier: LoyaltyTier };
}

export interface CustomerListResponse {
  data: CustomerListItemDto[];
  total: number;
  page: number;
  limit: number;
}
