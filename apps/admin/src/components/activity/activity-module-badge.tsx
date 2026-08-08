'use client';

import {
  Shield,
  ShoppingBag,
  ChefHat,
  Truck,
  Package,
  UtensilsCrossed,
  FileText,
  Users,
  BarChart3,
  CreditCard,
  Ticket,
  Globe,
  Search,
  Image,
  Settings,
  Lock,
  Code,
  Database,
  Server,
  KeyRound,
} from 'lucide-react';
import { cn } from '@mdh/ui';

const MODULE_CONFIG: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  AUTH: { icon: KeyRound, color: 'text-indigo-600 bg-indigo-50', label: 'Authentication' },
  ORDERS: { icon: ShoppingBag, color: 'text-blue-600 bg-blue-50', label: 'Orders' },
  KITCHEN: { icon: ChefHat, color: 'text-orange-600 bg-orange-50', label: 'Kitchen' },
  DELIVERY: { icon: Truck, color: 'text-cyan-600 bg-cyan-50', label: 'Delivery' },
  INVENTORY: { icon: Package, color: 'text-amber-600 bg-amber-50', label: 'Inventory' },
  MENU: { icon: UtensilsCrossed, color: 'text-emerald-600 bg-emerald-50', label: 'Menu' },
  CMS: { icon: FileText, color: 'text-violet-600 bg-violet-50', label: 'CMS' },
  CUSTOMERS: { icon: Users, color: 'text-pink-600 bg-pink-50', label: 'Customers' },
  REPORTS: { icon: BarChart3, color: 'text-teal-600 bg-teal-50', label: 'Reports' },
  PAYMENTS: { icon: CreditCard, color: 'text-green-600 bg-green-50', label: 'Payments' },
  COUPONS: { icon: Ticket, color: 'text-rose-600 bg-rose-50', label: 'Coupons' },
  WEBSITE: { icon: Globe, color: 'text-sky-600 bg-sky-50', label: 'Website' },
  SEO: { icon: Search, color: 'text-lime-600 bg-lime-50', label: 'SEO' },
  MEDIA: { icon: Image, color: 'text-fuchsia-600 bg-fuchsia-50', label: 'Media' },
  SETTINGS: { icon: Settings, color: 'text-gray-600 bg-gray-100', label: 'Settings' },
  SECURITY: { icon: Lock, color: 'text-red-600 bg-red-50', label: 'Security' },
  API: { icon: Code, color: 'text-slate-600 bg-slate-100', label: 'API' },
  DATABASE: { icon: Database, color: 'text-stone-600 bg-stone-100', label: 'Database' },
  SYSTEM: { icon: Server, color: 'text-neutral-600 bg-neutral-100', label: 'System' },
};

export function ActivityModuleBadge({ module }: { module: string }) {
  const cfg = MODULE_CONFIG[module] ?? {
    icon: Shield,
    color: 'text-gray-600 bg-gray-100',
    label: module,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold',
        cfg.color,
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function getModuleConfig(module: string) {
  return MODULE_CONFIG[module] ?? MODULE_CONFIG.SYSTEM;
}
