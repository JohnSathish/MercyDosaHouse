'use client';

import { usePathname } from 'next/navigation';
import { ResponsiveSubNav, type ResponsiveSubNavItem } from '@/components/ui/responsive-sub-nav';
import {
  LayoutDashboard,
  ShoppingBag,
  UserPlus,
  Users,
  Radio,
  Map,
  MapPin,
  IndianRupee,
  Camera,
  FileBarChart,
  BarChart3,
  Settings,
} from 'lucide-react';

const DELIVERY_NAV: ResponsiveSubNavItem[] = [
  { href: '/delivery', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/delivery/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/delivery/assign', label: 'Assign', icon: UserPlus },
  { href: '/delivery/executives', label: 'Executives', icon: Users },
  { href: '/delivery/tracking', label: 'Tracking', icon: Radio },
  { href: '/delivery/map', label: 'Map', icon: Map },
  { href: '/delivery/zones', label: 'Zones', icon: MapPin },
  { href: '/delivery/charges', label: 'Charges', icon: IndianRupee },
  { href: '/delivery/proof', label: 'Proof', icon: Camera },
  { href: '/delivery/reports', label: 'Reports', icon: FileBarChart },
  { href: '/delivery/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/delivery/settings', label: 'Settings', icon: Settings },
];

export function DeliveryNav() {
  const pathname = usePathname();
  return <ResponsiveSubNav items={DELIVERY_NAV} pathname={pathname} />;
}
