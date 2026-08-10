'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
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
  Brain,
  Monitor,
} from 'lucide-react';

const REPORTS_NAV = [
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
  return (
    <nav className="flex flex-wrap gap-1 mb-6 p-1 bg-muted/50 rounded-xl">
      {REPORTS_NAV.map(({ href, label, icon: Icon, exact }) => {
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

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <ReportsNav />
      {children}
    </div>
  );
}
