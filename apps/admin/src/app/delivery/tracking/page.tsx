'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Radio, Truck, MapPin, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto, DeliveryOrderDto } from '@mdh/types';
import { DeliveryStatusBadge } from '@/components/delivery/delivery-status-badge';
import { ExecutiveStatusBadge } from '@/components/delivery/delivery-status-badge';

export default function LiveTrackingPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
    refetchInterval: 10_000,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: () => api.get<DeliveryOrderDto[]>('/delivery/orders/list?status=on_the_way'),
    refetchInterval: 10_000,
  });

  if (isLoading || !dashboard) {
    return <div className="h-96 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6 text-[#14532D]" />
          Live Tracking
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time rider locations and active deliveries
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Live Map</h3>
          <div className="relative h-80 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 border overflow-hidden">
            <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-800 px-3 py-2 rounded-lg shadow text-xs">
              <p className="font-semibold">🍽 Mercy Dosa House</p>
              <p className="text-muted-foreground">Tura, Meghalaya</p>
            </div>
            {dashboard.liveRiders.map((r, i) => (
              <motion.div
                key={r.id}
                animate={{ x: [0, 10, -5, 0], y: [0, -8, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4 + i, ease: 'easeInOut' }}
                className="absolute"
                style={{ left: `${15 + i * 28}%`, top: `${25 + (i % 3) * 18}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-[#14532D] text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold mt-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full shadow">
                    {r.name}
                  </span>
                  <ExecutiveStatusBadge status={r.status} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-semibold mb-3">Online Riders ({dashboard.stats.onlineRiders})</h3>
            {dashboard.executives.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
              >
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.vehicleNumber}</p>
                </div>
                <ExecutiveStatusBadge status={e.status} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Active Deliveries
            </h3>
            {activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deliveries</p>
            ) : (
              activeOrders.map((o) => (
                <div key={o.id} className="py-2 border-b last:border-0 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold">{o.orderNumber}</span>
                    <DeliveryStatusBadge status={o.assignment?.status ?? 'WAITING'} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{o.deliveryAddress}</p>
                  {o.assignment?.etaMinutes && (
                    <p className="text-xs font-semibold text-purple-600 mt-0.5">
                      ETA: {o.assignment.etaMinutes} min
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
