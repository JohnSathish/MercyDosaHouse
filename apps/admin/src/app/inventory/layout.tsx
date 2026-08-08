'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
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

const INVENTORY_NAV = [
  { href: '/inventory', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/inventory/ingredients', label: 'Ingredients', icon: Package },
  { href: '/inventory/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/inventory/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { href: '/inventory/adjustments', label: 'Stock Adjustment', icon: ArrowUpDown },
  { href: '/inventory/recipes', label: 'Recipes', icon: ChefHat },
  { href: '/inventory/low-stock', label: 'Low Stock', icon: AlertTriangle },
  { href: '/inventory/expiry', label: 'Expiry Tracking', icon: Clock },
  { href: '/inventory/waste', label: 'Waste Management', icon: Trash2 },
  { href: '/inventory/reports', label: 'Reports', icon: FileBarChart },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 mb-6 p-1 bg-muted/50 rounded-xl">
      {INVENTORY_NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
              active
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-muted-foreground hover:bg-white dark:hover:bg-gray-800 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <InventoryNav />
      {children}
    </div>
  );
}
