import { createApiClient } from '@mdh/sdk';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const api = createApiClient(API_URL);

export const ADMIN_NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/menu', label: 'Menu' },
  { href: '/categories', label: 'Categories' },
  { href: '/settings', label: 'Settings' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/reports', label: 'Reports' },
];
