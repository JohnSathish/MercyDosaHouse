'use client';

import Image from 'next/image';
import { ShoppingBag, UtensilsCrossed, Package, Truck, BarChart3, Monitor } from 'lucide-react';
import { BRAND } from '@mdh/utils';

const FEATURES = [
  { icon: ShoppingBag, title: 'Manage Orders', desc: 'Track and fulfill orders' },
  { icon: UtensilsCrossed, title: 'Menu & CMS', desc: 'Update items and offers' },
  { icon: Package, title: 'Inventory', desc: 'Stock and ingredients' },
  { icon: Truck, title: 'Delivery', desc: 'Manage riders and routes' },
  { icon: BarChart3, title: 'Analytics', desc: 'Sales and insights' },
  { icon: Monitor, title: 'POS System', desc: 'In-store billing' },
];

const FOOD_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.9' opacity='0.35'%3E%3Cellipse cx='20' cy='22' rx='12' ry='5'/%3E%3Cpath d='M8 22 Q20 12 32 22'/%3E%3Ccircle cx='58' cy='18' r='6'/%3E%3Cpath d='M52 38 L64 38 L58 48 Z'/%3E%3Crect x='14' y='52' width='16' height='10' rx='2'/%3E%3Cpath d='M48 58 Q58 50 68 58'/%3E%3C/g%3E%3C/svg%3E")`;

export function LoginBrandingPanel() {
  return (
    <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[40%] max-w-[520px] shrink-0 flex-col bg-[#0b4a2d] text-white overflow-hidden min-h-full">
      <div
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{ backgroundImage: FOOD_PATTERN, backgroundSize: '80px 80px' }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b4a2d] via-[#0a4228] to-[#083820] pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1 px-10 xl:px-12 pt-10 xl:pt-12 pb-8 min-h-0">
        <div className="flex items-center gap-4 mb-5 shrink-0">
          <Image
            src="/images/logo.png"
            alt={BRAND.name}
            width={52}
            height={52}
            className="rounded-full ring-2 ring-white/25 shadow-md shrink-0"
            priority
          />
          <div>
            <h1 className="text-[1.35rem] xl:text-2xl font-bold tracking-tight leading-tight">
              {BRAND.name}
            </h1>
            <p className="text-[#d4af37] text-[13px] font-medium mt-0.5">
              Restaurant Management System
            </p>
          </div>
        </div>

        <p className="text-white/80 text-[13px] leading-relaxed max-w-[340px] mb-6 shrink-0">
          Manage orders, menu, inventory, delivery, analytics, and POS billing — all from one
          powerful admin workspace built for Mercy Dosa House.
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-[380px] shrink-0">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl bg-black/15 border border-white/[0.12] backdrop-blur-[2px] px-3.5 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/25">
                <Icon className="h-[18px] w-[18px] text-[#d4af37]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-semibold leading-tight text-white">{title}</p>
                <p className="text-[11px] text-white/45 mt-1 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Full dosa photo — small, uncropped */}
        <div className="mt-auto pt-8 shrink-0">
          <div className="relative w-full max-w-[300px] h-[130px] xl:h-[145px] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/15 bg-[#0b4a2d]">
            <Image
              src="/images/hero-dosa.png"
              alt="Masala dosa with sambar and chutney"
              fill
              className="object-contain object-left-bottom p-1"
              sizes="300px"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
