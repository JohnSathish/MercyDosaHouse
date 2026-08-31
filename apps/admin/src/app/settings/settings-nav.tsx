'use client';

import { usePathname } from 'next/navigation';
import { ResponsiveSubNav, type ResponsiveSubNavItem } from '@/components/ui/responsive-sub-nav';
import { Bell, Mail, MessageSquare, Receipt, Settings, Smartphone } from 'lucide-react';

const SETTINGS_NAV: ResponsiveSubNavItem[] = [
  { href: '/settings', label: 'General', icon: Settings, exact: true },
  { href: '/settings/authentication', label: 'Email & Authentication', icon: Mail },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/feedback', label: 'Feedback & Reviews', icon: MessageSquare },
  { href: '/settings/billing', label: 'Billing & Invoice', icon: Receipt },
  { href: '/settings/app-promo', label: 'App promotion', icon: Smartphone },
];

export function SettingsNav() {
  const pathname = usePathname();
  return <ResponsiveSubNav items={SETTINGS_NAV} pathname={pathname} />;
}
