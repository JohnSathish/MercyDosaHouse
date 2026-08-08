'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@mdh/utils';
import type { DeliveryDashboardDto, DeliveryOrderDto } from '@mdh/types';
import {
  Clock,
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  IndianRupee,
  Timer,
} from 'lucide-react';
import { cn, Badge, Button } from '@mdh/ui';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { DeliveryTimeline } from './delivery-timeline';

const STAT_CARDS = [
  { key: 'waiting', label: 'Orders Waiting', icon: Clock, color: 'from-gray-500 to-gray-600' },
  { key: 'assigned', label: 'Assigned', icon: Users, color: 'from-blue-500 to-blue-600' },
  { key: 'pickedUp', label: 'Picked Up', icon: Package, color: 'from-orange-500 to-orange-600' },
  { key: 'onTheWay', label: 'On The Way', icon: Truck, color: 'from-purple-500 to-purple-600' },
  {
    key: 'deliveredToday',
    label: 'Delivered Today',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-emerald-600',
  },
  { key: 'cancelledToday', label: 'Cancelled', icon: XCircle, color: 'from-red-500 to-red-600' },
] as const;

function OrderRow({ order }: { order: DeliveryOrderDto }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0 text-sm">
      <div className="min-w-0">
        <p className="font-mono font-semibold">{order.orderNumber}</p>
        <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
      </div>
      <div className="text-right shrink-0">
        <DeliveryStatusBadge status={order.assignment?.status ?? 'WAITING'} />
        <p className="text-xs font-bold mt-0.5">{formatCurrency(order.grandTotal)}</p>
      </div>
    </div>
  );
}

export function DeliveryDashboardView({
  data,
  loading,
}: {
  data?: DeliveryDashboardDto;
  loading?: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn('rounded-xl bg-gradient-to-br text-white p-4 shadow-sm', color)}
          >
            <div className="flex items-center gap-2 mb-1 opacity-90">
              <Icon className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wide font-semibold">{label}</span>
            </div>
            <p className="text-2xl font-bold">{data.stats[key]}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-gradient-to-br from-[#14532D]/10 to-emerald-50 dark:from-[#14532D]/20 dark:to-gray-900 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-5 w-5 text-[#14532D]" />
            <span className="text-sm font-semibold text-muted-foreground">
              Average Delivery Time
            </span>
          </div>
          <p className="text-3xl font-bold text-[#14532D]">{data.stats.avgDeliveryMinutes} min</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-gray-900 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-semibold text-muted-foreground">
              Delivery Revenue Today
            </span>
          </div>
          <p className="text-3xl font-bold text-amber-700">
            {formatCurrency(data.stats.deliveryRevenue)}
          </p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#14532D]" /> Live Delivery Map
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {data.stats.onlineRiders} riders online
            </Badge>
          </div>
          <div className="relative h-56 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden border">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#14532D_0%,transparent_50%),radial-gradient(circle_at_70%_60%,#059669_0%,transparent_40%)]" />
            {data.liveRiders.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="absolute"
                style={{
                  left: `${20 + i * 25}%`,
                  top: `${30 + (i % 2) * 20}%`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-[#14532D] text-white flex items-center justify-center shadow-lg">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-semibold mt-1 bg-white/90 dark:bg-gray-800 px-1.5 py-0.5 rounded shadow">
                    {r.name?.split(' ')[0]}
                  </span>
                </div>
              </motion.div>
            ))}
            <div className="absolute bottom-3 left-3 right-3 flex gap-2 text-[10px]">
              <span className="bg-white/90 dark:bg-gray-800 px-2 py-1 rounded shadow">
                🍽 Restaurant
              </span>
              <span className="bg-white/90 dark:bg-gray-800 px-2 py-1 rounded shadow">
                🛵 Riders
              </span>
              <span className="bg-white/90 dark:bg-gray-800 px-2 py-1 rounded shadow">
                📍 Customers
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Delivery Timeline</h3>
          <DeliveryTimeline compact />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Widget title="Top Delivery Executives">
          {data.executives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No executives yet</p>
          ) : (
            data.executives.map((e, i) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {e.employeeId} · {e.totalDeliveries} deliveries
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="text-[9px] bg-amber-100 text-amber-700">
                    ★ {e.rating.toFixed(1)}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{e.status}</p>
                </div>
              </div>
            ))
          )}
        </Widget>

        <Widget title="Pending Assignments">
          {data.pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending orders</p>
          ) : (
            data.pendingOrders.slice(0, 5).map((o) => <OrderRow key={o.id} order={o} />)
          )}
        </Widget>

        <Widget title="Recent Deliveries">
          {data.recentDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries today</p>
          ) : (
            data.recentDeliveries.map((o) => <OrderRow key={o.id} order={o} />)
          )}
        </Widget>
      </div>
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
