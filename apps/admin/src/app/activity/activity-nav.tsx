'use client';

import { usePathname } from 'next/navigation';
import { ResponsiveSubNav, type ResponsiveSubNavItem } from '@/components/ui/responsive-sub-nav';
import { LayoutDashboard, List, Shield, KeyRound, Monitor, Download } from 'lucide-react';

const ACTIVITY_NAV: ResponsiveSubNavItem[] = [
  { href: '/activity', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/activity/logs', label: 'All Logs', icon: List },
  { href: '/activity/security', label: 'Security', icon: Shield },
  { href: '/activity/login', label: 'Login History', icon: KeyRound },
  { href: '/activity/sessions', label: 'Sessions', icon: Monitor },
  { href: '/activity/export', label: 'Export', icon: Download },
];

export function ActivityNav() {
  const pathname = usePathname();
  return <ResponsiveSubNav items={ACTIVITY_NAV} pathname={pathname} />;
}
