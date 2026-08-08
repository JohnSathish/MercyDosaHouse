export type DashboardSection =
  'dashboard' | 'orders' | 'favorites' | 'addresses' | 'coupons' | 'notifications' | 'settings';

export interface UserProfile {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  createdAt?: string;
  addresses?: unknown[];
}

export function getLoyaltyTier(orderCount: number): { label: string; color: string } {
  if (orderCount >= 16) return { label: 'Gold Member', color: 'from-amber-400 to-yellow-600' };
  if (orderCount >= 6) return { label: 'Silver Member', color: 'from-gray-300 to-gray-500' };
  return { label: 'Bronze Member', color: 'from-orange-400 to-amber-700' };
}

export function getRewardPoints(orderCount: number, favoriteCount: number): number {
  return orderCount * 30 + favoriteCount * 10;
}

export function getCustomerId(userId: string): string {
  return userId.slice(-4).toUpperCase();
}

export function getInitials(name?: string | null): string {
  if (!name) return 'MD';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
