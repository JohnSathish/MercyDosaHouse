'use client';

import { usePathname } from 'next/navigation';
import { ResponsiveSubNav, type ResponsiveSubNavItem } from '@/components/ui/responsive-sub-nav';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  Truck,
  ChefHat,
  Package,
  IndianRupee,
  Download,
  Monitor,
} from 'lucide-react';

const REPORTS_NAV: ResponsiveSubNavItem[] = [
  { href: '/reports', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/reports/sales', label: 'Sales', icon: TrendingUp },
  { href: '/reports/products', label: 'Products', icon: UtensilsCrossed },
  { href: '/reports/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/reports/pos', label: 'POS', icon: Monitor },
  { href: '/reports/customers', label: 'Customers', icon: Users },
  { href: '/reports/delivery', label: 'Delivery', icon: Truck },
  { href: '/reports/kitchen', label: 'Kitchen', icon: ChefHat },
  { href: '/reports/inventory', label: 'Inventory', icon: Package },
  { href: '/reports/financial', label: 'Financial', icon: IndianRupee },
  { href: '/reports/export', label: 'Export', icon: Download },
];

export function ReportsNav() {
  const pathname = usePathname();
  return <ResponsiveSubNav items={REPORTS_NAV} pathname={pathname} />;
}
