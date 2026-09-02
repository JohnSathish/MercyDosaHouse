'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MapPin,
  Ticket,
  Bell,
  Coins,
  Settings,
  Star,
  FileText,
} from 'lucide-react';
import { Badge } from '@mdh/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { DashboardSection, UserProfile } from './types';
import { getCustomerId, getInitials, getLoyaltyTier } from './types';

const NAV: {
  id: DashboardSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'My Orders', icon: ShoppingBag },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'feedback', label: 'My Feedback', icon: Star },
  { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'loyalty', label: 'Bronze Coins', icon: Coins },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface DashboardSidebarProps {
  user: UserProfile | null;
  active: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onLogoutClick: () => void;
  orderCount: number;
  mobile?: boolean;
}

function formatMemberSince(createdAt?: string | null): string {
  if (!createdAt) return 'Recently';
  const d = new Date(createdAt);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function DashboardSidebar({
  user,
  active,
  onNavigate,
  onLogoutClick,
  orderCount,
  mobile,
}: DashboardSidebarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayUser = mounted ? user : null;
  const tier = getLoyaltyTier(orderCount);
  const memberSince = formatMemberSince(displayUser?.createdAt);
  const initials = displayUser
    ? getInitials(displayUser.name, displayUser.phone ?? undefined)
    : null;

  return (
    <aside
      className={`w-full shrink-0 flex-col bg-white rounded-2xl shadow-md border border-gray-100 h-fit lg:w-72 ${
        mobile ? 'flex' : 'hidden lg:flex lg:sticky lg:top-28'
      }`}
    >
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-14 w-14 ring-2 ring-secondary/30">
            <AvatarFallback className="text-lg" suppressHydrationWarning>
              {initials ?? '·'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-bold text-[#14532D] truncate" suppressHydrationWarning>
              {displayUser?.name || 'Customer'}
            </p>
            <p className="text-xs text-gray-500 truncate" suppressHydrationWarning>
              {displayUser?.phone || displayUser?.email || '\u00A0'}
            </p>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-gray-500">
          <p suppressHydrationWarning>ID: #{getCustomerId(displayUser?.id || '0000')}</p>
          <p>Member since {memberSince}</p>
        </div>
        <Badge className={`mt-3 bg-gradient-to-r ${tier.color} text-white border-0`}>
          {tier.label}
        </Badge>
      </div>

      <nav className="p-3 flex-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${
              active === id
                ? 'bg-[#14532D] text-white shadow-md'
                : 'text-gray-600 hover:bg-[#FFF8E8] hover:text-[#14532D]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export { NAV as DASHBOARD_NAV };
