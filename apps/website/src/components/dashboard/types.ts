export type DashboardSection =
  | 'dashboard'
  | 'orders'
  | 'invoices'
  | 'favorites'
  | 'feedback'
  | 'addresses'
  | 'coupons'
  | 'loyalty'
  | 'notifications'
  | 'settings';

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

const GENERIC_CUSTOMER_NAME = /^Customer\s+(\d{4})$/i;

export function isGenericCustomerName(name?: string | null): boolean {
  return !!name && GENERIC_CUSTOMER_NAME.test(name.trim());
}

/** Prefer address/guest contact name over auto-generated OTP profile names. */
export function resolveCheckoutCustomerName(
  contactName?: string | null,
  profileName?: string | null,
  fallback = 'Guest',
): string {
  const fromContact = contactName?.trim();
  if (fromContact) return fromContact;
  const fromProfile = profileName?.trim();
  if (fromProfile && !isGenericCustomerName(fromProfile)) return fromProfile;
  return fromProfile || fallback;
}

/** Display name for checkout banner and similar UI. */
export function resolveCustomerDisplayName(
  profileName?: string | null,
  contactName?: string | null,
  phone?: string | null,
): string {
  const resolved = resolveCheckoutCustomerName(contactName, profileName, '');
  if (resolved) return resolved;
  return phone ? `Customer ${phone.slice(-4)}` : 'Customer';
}

/** Compact label for nav/header — keeps auto-generated names like "Customer 3655" intact. */
export function getHeaderDisplayName(name?: string | null, phone?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return phone ? `Customer ${phone.slice(-4)}` : 'Profile';
  }
  if (isGenericCustomerName(trimmed)) {
    return trimmed;
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function getInitials(name?: string | null, phone?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return phone ? phone.slice(-2).toUpperCase() : 'MD';
  }
  const generic = trimmed.match(GENERIC_CUSTOMER_NAME);
  if (generic?.[1]) {
    return generic[1].slice(0, 2);
  }
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
