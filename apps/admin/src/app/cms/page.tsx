'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Badge } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import type { DashboardStatsDto } from '@mdh/types';
import {
  Globe,
  Image,
  Tag,
  MessageSquare,
  FileText,
  Palette,
  ArrowRight,
  Smartphone,
} from 'lucide-react';

const QUICK_LINKS = [
  {
    href: '/cms/mobile',
    label: 'Mobile App Config',
    icon: Smartphone,
    desc: 'Remote config for Android apps',
  },
  { href: '/cms/homepage', label: 'Home Page Builder', icon: Globe, desc: 'Hero, stats, sections' },
  { href: '/cms/offers', label: 'Offers & Promotions', icon: Tag, desc: 'Banners, flash sales' },
  { href: '/cms/gallery', label: 'Gallery', icon: Image, desc: 'Food photos & albums' },
  {
    href: '/cms/testimonials',
    label: 'Testimonials',
    icon: MessageSquare,
    desc: 'Customer reviews',
  },
  { href: '/cms/pages', label: 'Pages', icon: FileText, desc: 'About, policies' },
  { href: '/cms/theme', label: 'Theme Settings', icon: Palette, desc: 'Colors, logo, fonts' },
];

export default function CmsDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStatsDto>('/dashboard/stats'),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['cms-sections'],
    queryFn: () => api.get<{ id: string; status: string }[]>('/cms/sections?pageKey=home'),
  });

  const publishedSections = sections.filter((s) => s.status === 'PUBLISHED').length;

  return (
    <div>
      <CmsPageHeader
        title="Website CMS"
        description="Manage every visible part of your website without touching code."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Orders" value={stats?.ordersToday ?? '—'} />
        <StatCard label="Pending Orders" value={stats?.pendingOrders ?? '—'} />
        <StatCard label="Revenue Today" value={stats ? `₹${stats.revenueToday}` : '—'} />
        <StatCard label="Published Sections" value={publishedSections} />
      </div>

      <h2 className="text-lg font-bold text-[#14532D] mb-4">Quick Access</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#14532D]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#14532D]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#14532D]">{label}</h3>
                    <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-[#FFF8E8] border border-[#F59E0B]/30">
        <Badge className="mb-2 bg-[#F59E0B] text-[#1F2937]">Live Preview</Badge>
        <p className="text-sm text-gray-600">
          Changes publish instantly to the website when you click <strong>Publish</strong>. Visit{' '}
          <a
            href={APP_URLS.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#14532D] font-medium underline"
          >
            {APP_URLS.website.replace(/^https?:\/\//, '')}
          </a>{' '}
          to preview.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#14532D] mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
