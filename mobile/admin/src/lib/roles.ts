import type { AuthUser } from '@mdh/types';
import { ADMIN_ROLES, STAFF_ROLES } from './constants';

export function userHasRole(user: AuthUser | null, roles: readonly string[]): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const assigned = Array.isArray(user.roles) ? user.roles : [];
  return assigned.some((r) => roles.includes(r));
}

export function isStaffUser(user: AuthUser | null): boolean {
  return userHasRole(user, STAFF_ROLES);
}

export function isAdminUser(user: AuthUser | null): boolean {
  return userHasRole(user, ADMIN_ROLES);
}

export function canManageMenu(user: AuthUser | null): boolean {
  return userHasRole(user, ['SUPER_ADMIN', 'MANAGER']);
}

export function canUsePos(user: AuthUser | null): boolean {
  return userHasRole(user, ['SUPER_ADMIN', 'MANAGER', 'CASHIER']);
}

export function canUseKds(user: AuthUser | null): boolean {
  return userHasRole(user, ['SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF']);
}

export function canManageDelivery(user: AuthUser | null): boolean {
  return userHasRole(user, ['SUPER_ADMIN', 'MANAGER', 'DELIVERY_STAFF']);
}

export function roleLabel(user: AuthUser | null): string {
  if (!user) return 'Guest';
  if (user.isSuperAdmin || user.roles.includes('SUPER_ADMIN')) return 'Super Admin';
  if (user.roles.includes('MANAGER')) return 'Manager';
  if (user.roles.includes('CASHIER')) return 'Cashier';
  if (user.roles.includes('KITCHEN_STAFF')) return 'Kitchen';
  if (user.roles.includes('DELIVERY_STAFF')) return 'Delivery';
  return user.roles[0] || 'Staff';
}
