'use client';

import { usePathname } from 'next/navigation';
import { ResponsiveSubNav, type ResponsiveSubNavItem } from '@/components/ui/responsive-sub-nav';
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  ArrowUpDown,
  ChefHat,
  AlertTriangle,
  Clock,
  Trash2,
  FileBarChart,
} from 'lucide-react';

const INVENTORY_NAV: ResponsiveSubNavItem[] = [
  { href: '/inventory', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/inventory/ingredients', label: 'Ingredients', icon: Package },
  { href: '/inventory/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/inventory/purchase-orders', label: 'Purchase', icon: ShoppingCart },
  { href: '/inventory/adjustments', label: 'Adjustments', icon: ArrowUpDown },
  { href: '/inventory/recipes', label: 'Recipes', icon: ChefHat },
  { href: '/inventory/low-stock', label: 'Low Stock', icon: AlertTriangle },
  { href: '/inventory/expiry', label: 'Expiry', icon: Clock },
  { href: '/inventory/waste', label: 'Waste', icon: Trash2 },
  { href: '/inventory/reports', label: 'Reports', icon: FileBarChart },
];

export function InventoryNav() {
  const pathname = usePathname();
  return <ResponsiveSubNav items={INVENTORY_NAV} pathname={pathname} />;
}
