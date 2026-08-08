'use client';

import { motion } from 'framer-motion';
import { Clock, Flame, Star, Zap } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { KitchenPriority } from '@mdh/types';

/** String-keyed config avoids runtime crashes if enum re-exports are stale in @mdh/types dist */
const PRIORITY_CONFIG: Record<
  KitchenPriority | string,
  { label: string; className: string; icon: typeof Star }
> = {
  NORMAL: {
    label: 'Normal',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Clock,
  },
  HIGH: {
    label: 'High',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: Flame,
  },
  VIP: {
    label: 'VIP',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: Star,
  },
  EXPRESS: {
    label: 'Express',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: Zap,
  },
};

export function PriorityBadge({ priority }: { priority: KitchenPriority | string }) {
  const key = String(priority ?? 'NORMAL');
  const config = PRIORITY_CONFIG[key] ?? PRIORITY_CONFIG.NORMAL;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        config.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function priorityGlow(priority: KitchenPriority | string): string {
  switch (String(priority)) {
    case 'HIGH':
      return 'ring-2 ring-orange-500/50 shadow-orange-500/20';
    case 'VIP':
      return 'ring-2 ring-purple-500/50 shadow-purple-500/20';
    case 'EXPRESS':
      return 'ring-2 ring-red-500/50 shadow-red-500/20 animate-pulse';
    default:
      return '';
  }
}

export function OrderCardMotion({
  children,
  priority,
}: {
  children: React.ReactNode;
  priority: KitchenPriority | string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(priorityGlow(priority))}
    >
      {children}
    </motion.div>
  );
}
