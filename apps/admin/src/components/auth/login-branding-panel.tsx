'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ChefHat,
  Package,
  BarChart3,
  Users,
  ClipboardList,
  FileText,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { BRAND } from '@mdh/utils';

const FLOATING = [
  {
    src: '/images/cheese-dosa.png',
    label: 'Cheese Dosa',
    top: '6%',
    left: '5%',
    delay: 0,
    rotate: -6,
  },
  {
    src: '/images/chicken-biryani.png',
    label: 'Biryani',
    top: '14%',
    right: '2%',
    delay: 0.6,
    rotate: 8,
  },
  {
    src: '/images/idli-4-pieces.png',
    label: 'Idli',
    bottom: '24%',
    left: '2%',
    delay: 1.2,
    rotate: -4,
  },
  {
    src: '/images/vada-4-pieces.png',
    label: 'Vada',
    bottom: '10%',
    right: '6%',
    delay: 1.8,
    rotate: 6,
  },
];

const FEATURES = [
  { icon: ClipboardList, text: 'Manage Orders', desc: 'Live order board' },
  { icon: Users, text: 'Customers', desc: 'Profiles & history' },
  { icon: ChefHat, text: 'Menu', desc: 'Items & pricing' },
  { icon: Package, text: 'Inventory', desc: 'Stock tracking' },
  { icon: BarChart3, text: 'Analytics', desc: 'Sales insights' },
  { icon: FileText, text: 'Reports', desc: 'Export & summaries' },
];

const HIGHLIGHTS = [
  { icon: TrendingUp, label: 'Real-time orders' },
  { icon: Shield, label: 'Role-based access' },
];

export function LoginBrandingPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(245,158,11,0.22),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#F59E0B]/30 blur-md scale-110" />
            <Image
              src="/images/logo.png"
              alt={BRAND.name}
              width={76}
              height={76}
              className="relative rounded-full ring-4 ring-white/25 shadow-xl"
            />
          </div>
          <div>
            <h1 className="text-3xl xl:text-[2.15rem] font-bold tracking-tight">{BRAND.name}</h1>
            <p className="text-[#F59E0B] font-semibold text-sm mt-1 tracking-wide">
              Restaurant Management Dashboard
            </p>
          </div>
        </div>

        <p className="text-white/80 text-lg max-w-lg mb-6 leading-relaxed">
          Manage orders, menu, customers, and analytics — all in one premium admin workspace.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium text-white/90"
            >
              <Icon className="w-3.5 h-3.5 text-[#F59E0B]" />
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          {FEATURES.map(({ icon: Icon, text, desc }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="group flex items-start gap-3 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3.5 border border-white/10 hover:border-white/20 transition-all cursor-default"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/20 group-hover:bg-[#F59E0B]/30 transition-colors">
                <Icon className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{text}</p>
                <p className="text-[11px] text-white/55 mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Food showcase */}
      <div className="relative h-56 xl:h-64 mt-8 shrink-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.7, type: 'spring', stiffness: 120 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 xl:w-52 xl:h-52 rounded-[1.75rem] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)] border-4 border-white/25 z-10"
        >
          <Image
            src="/images/hero-dosa.png"
            alt="Masala Dosa"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <p className="absolute bottom-3 left-3 text-xs font-bold text-white drop-shadow">
            Signature Masala Dosa
          </p>
        </motion.div>

        {FLOATING.map((item) => (
          <motion.div
            key={item.label}
            animate={{ y: [0, -12, 0], rotate: [item.rotate, item.rotate + 4, item.rotate] }}
            transition={{ repeat: Infinity, duration: 4.5, delay: item.delay, ease: 'easeInOut' }}
            className="absolute z-20 bg-white/12 backdrop-blur-lg rounded-2xl p-2 border border-white/20 shadow-xl"
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              bottom: item.bottom,
            }}
          >
            <div className="relative w-16 h-16 rounded-xl overflow-hidden mb-1.5 ring-2 ring-white/20">
              <Image src={item.src} alt={item.label} fill className="object-cover" sizes="64px" />
            </div>
            <p className="text-[10px] font-bold text-white text-center px-1">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
