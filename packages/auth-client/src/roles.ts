import type { AuthUser } from '@mdh/types';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGER: 'MANAGER',
  RESTAURANT_ADMIN: 'MANAGER',
  KITCHEN_STAFF: 'KITCHEN_STAFF',
  DELIVERY_STAFF: 'DELIVERY_STAFF',
  CASHIER: 'CASHIER',
  CUSTOMER: 'CUSTOMER',
} as const;

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER] as const;

export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.MANAGER,
  ROLES.KITCHEN_STAFF,
  ROLES.DELIVERY_STAFF,
  ROLES.CASHIER,
] as const;

export function userHasRole(user: AuthUser | null, roles: readonly string[]): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.roles.some((r) => roles.includes(r));
}

export function isCustomer(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return false;
  return (
    user.roles.includes(ROLES.CUSTOMER) && !user.roles.some((r) => STAFF_ROLES.includes(r as never))
  );
}

export function isAdminUser(user: AuthUser | null): boolean {
  return userHasRole(user, ADMIN_ROLES);
}

export function isKitchenStaff(user: AuthUser | null): boolean {
  return userHasRole(user, [ROLES.KITCHEN_STAFF, ROLES.SUPER_ADMIN, ROLES.MANAGER]);
}

export function isDeliveryStaff(user: AuthUser | null): boolean {
  return userHasRole(user, [ROLES.DELIVERY_STAFF, ROLES.SUPER_ADMIN, ROLES.MANAGER]);
}

export interface AppUrls {
  website?: string;
  admin?: string;
  kitchen?: string;
  delivery?: string;
}

const DEFAULT_URLS: AppUrls = {
  website: 'http://localhost:3000',
  admin: 'http://localhost:3002',
  kitchen: 'http://localhost:3003',
  delivery: 'http://localhost:3004',
};

/** Resolve post-login redirect URL based on user role */
export function getPostLoginRedirect(user: AuthUser | null, urls: AppUrls = {}): string {
  const u = { ...DEFAULT_URLS, ...urls };
  if (!user) return `${u.website}/`;

  if (
    user.isSuperAdmin ||
    user.roles.includes(ROLES.SUPER_ADMIN) ||
    user.roles.includes(ROLES.MANAGER)
  ) {
    return `${u.admin}/`;
  }
  if (user.roles.includes(ROLES.KITCHEN_STAFF) && !user.roles.includes(ROLES.MANAGER)) {
    return `${u.kitchen}/`;
  }
  if (user.roles.includes(ROLES.DELIVERY_STAFF) && !user.roles.includes(ROLES.MANAGER)) {
    return `${u.delivery}/`;
  }
  if (user.roles.includes(ROLES.CASHIER)) {
    return `${u.admin}/orders`;
  }
  return `${u.website}/dashboard`;
}

/** Where staff users should go if they hit customer routes */
export function getStaffPortalRedirect(user: AuthUser | null, urls: AppUrls = {}): string | null {
  if (!user || isCustomer(user)) return null;
  return getPostLoginRedirect(user, urls);
}
