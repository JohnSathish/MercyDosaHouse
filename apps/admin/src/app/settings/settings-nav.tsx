'use client';

import { usePathname } from 'next/navigation';
import { ResponsiveSubNav, type ResponsiveSubNavItem } from '@/components/ui/responsive-sub-nav';
import { Bell, Settings } from 'lucide-react';

const SETTINGS_NAV: ResponsiveSubNavItem[] = [
  { href: '/settings', label: 'General', icon: Settings, exact: true },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
];

export function SettingsNav() {
  const pathname = usePathname();
  return <ResponsiveSubNav items={SETTINGS_NAV} pathname={pathname} />;
}
