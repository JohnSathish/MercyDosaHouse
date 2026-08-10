import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Layers,
  Package,
  Truck,
  ChefHat,
  Users,
  FileBarChart,
  History,
  Settings,
  LogOut,
  Monitor,
} from 'lucide-react';

export type PosAdminLinkAction = 'settings' | 'exit-pos';

export interface PosAdminLink {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Admin app path, e.g. `/orders`. Ignored when `action` is set. */
  href?: string;
  /** Opens in a new browser tab (default true for href links). */
  newTab?: boolean;
  /** Special in-POS actions instead of navigation. */
  action?: PosAdminLinkAction;
  /** Keyboard shortcut hint shown in the launcher. */
  shortcut?: string;
  /** Shortcut key combo for power users (ctrl+alt+letter). */
  hotkey?: string;
}

/** Quick admin modules available from the POS app launcher. */
export const POS_ADMIN_LINKS: PosAdminLink[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    shortcut: 'Ctrl+Alt+H',
    hotkey: 'h',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    href: '/orders',
    shortcut: 'Ctrl+Alt+O',
    hotkey: 'o',
  },
  {
    id: 'menu',
    label: 'Menu Management',
    icon: UtensilsCrossed,
    href: '/menu',
    shortcut: 'Ctrl+Alt+M',
    hotkey: 'm',
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: Layers,
    href: '/categories',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    href: '/inventory',
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: Truck,
    href: '/delivery',
  },
  {
    id: 'kds',
    label: 'Kitchen Display',
    icon: ChefHat,
    href: '/kitchen',
    shortcut: 'Ctrl+Alt+K',
    hotkey: 'k',
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    href: '/customers',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    href: '/reports',
    shortcut: 'Ctrl+Alt+R',
    hotkey: 'r',
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    icon: History,
    href: '/activity',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    action: 'settings',
    newTab: false,
  },
  {
    id: 'exit-pos',
    label: 'Exit POS',
    icon: LogOut,
    action: 'exit-pos',
    newTab: false,
  },
];

export function resolveAdminUrl(adminBaseUrl: string, href: string): string {
  if (!href.startsWith('/')) return href;
  const base = adminBaseUrl.replace(/\/$/, '');
  if (!base) return href;
  return `${base}${href}`;
}

export function openAdminLink(adminBaseUrl: string, link: PosAdminLink): void {
  if (!link.href) return;
  const url = resolveAdminUrl(adminBaseUrl, link.href);
  if (link.newTab !== false) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
}

export function posHomeUrl(adminBaseUrl: string, posPath: string): string {
  const base = adminBaseUrl.replace(/\/$/, '');
  const path = posPath.startsWith('/') ? posPath : `/${posPath}`;
  return base ? `${base}${path}` : path;
}

export { Monitor as PosHomeIcon };
