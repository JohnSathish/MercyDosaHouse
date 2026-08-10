'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
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

const DELIVERY_NAV = [
  { href: '/delivery', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/delivery/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/delivery/assign', label: 'Assign Delivery', icon: UserPlus },
  { href: '/delivery/executives', label: 'Executives', icon: Users },
  { href: '/delivery/tracking', label: 'Live Tracking', icon: Radio },
  { href: '/delivery/map', label: 'Map View', icon: Map },
  { href: '/delivery/zones', label: 'Zones', icon: MapPin },
  { href: '/delivery/charges', label: 'Delivery Charges', icon: IndianRupee },
  { href: '/delivery/proof', label: 'Proof of Delivery', icon: Camera },
  { href: '/delivery/reports', label: 'Reports', icon: FileBarChart },
  { href: '/delivery/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/delivery/settings', label: 'Settings', icon: Settings },
];

export function DeliveryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 mb-6 p-1 bg-muted/50 rounded-xl">
      {DELIVERY_NAV.map(({ href, label, icon: Icon, exact }) => {
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
