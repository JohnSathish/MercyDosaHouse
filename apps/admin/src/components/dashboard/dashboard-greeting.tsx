'use client';

import { useAdminBrand } from '@/lib/use-admin-brand';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DashboardGreeting() {
  const { brand } = useAdminBrand();

  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#14532D] to-[#166534] text-white p-6 lg:p-8 xl:p-10 shadow-lg w-full">
      <p className="text-[#FDE68A] font-medium text-sm mb-1">{getGreeting()} ☀️</p>
      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold">{brand.businessName}</h1>
      {brand.tagline && <p className="text-white/80 text-sm mt-1">{brand.tagline}</p>}
      <p className="text-white/70 text-sm mt-2">{formatToday()}</p>
    </div>
  );
}
