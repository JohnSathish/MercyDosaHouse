'use client';

import { motion } from 'framer-motion';
import type { DeliveryExecutiveDetailDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { Badge, Button, cn } from '@mdh/ui';
import { ExecutiveStatusBadge } from './delivery-status-badge';
import { Bike, Phone, Star, MapPin, Package } from 'lucide-react';

interface DeliveryExecutivesGridProps {
  executives: DeliveryExecutiveDetailDto[];
  onStatusChange?: (id: string, status: string) => void;
  loading?: boolean;
}

export function DeliveryExecutivesGrid({
  executives,
  onStatusChange,
  loading,
}: DeliveryExecutivesGridProps) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (executives.length === 0) {
    return (
      <div className="rounded-xl border bg-white dark:bg-gray-900 p-12 text-center text-muted-foreground">
        No delivery executives configured. Run seed or add riders in Settings.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {executives.map((e, i) => (
        <motion.div
          key={e.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#14532D] to-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {e.user?.name?.charAt(0) ?? 'R'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">{e.user?.name ?? 'Rider'}</h3>
                <ExecutiveStatusBadge status={e.status} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{e.employeeId}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3 w-3" /> {e.user?.phone ?? '—'}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bike className="h-3 w-3" /> {e.vehicleType ?? '—'}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Star className="h-3 w-3 text-amber-500" /> {Number(e.rating).toFixed(1)}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3 w-3" /> {e.activeOrders} active
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Today&apos;s Earnings</p>
              <p className="font-bold text-[#14532D]">{formatCurrency(Number(e.todayEarnings))}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase">Total</p>
              <p className="font-bold">{e.totalDeliveries}</p>
            </div>
          </div>

          {e.vehicleNumber && (
            <p className="mt-2 text-[10px] font-mono text-muted-foreground">{e.vehicleNumber}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-1">
            {(['ONLINE', 'OFFLINE', 'BUSY', 'BREAK'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={e.status === s ? 'default' : 'outline'}
                className={cn('text-[9px] h-6 px-2', e.status === s && 'bg-[#14532D]')}
                onClick={() => onStatusChange?.(e.id, s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
