'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  IndianRupee,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  PackageCheck,
  Phone,
  Radio,
  RefreshCw,
  Route,
  Timer,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge, Button, cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { DeliveryDashboardDto, DeliveryOrderDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useDeliveryLiveUpdates } from '@/hooks/use-delivery-live-updates';
import { DeliveryLiveMap } from './delivery-live-map';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { DeliveryTimeline } from './delivery-timeline';

const KPI_CARDS = [
  { key: 'waiting', label: 'Orders waiting', icon: Clock3, tone: 'slate' },
  { key: 'assigned', label: 'Assigned', icon: Users, tone: 'blue' },
  { key: 'pickedUp', label: 'Picked up', icon: PackageCheck, tone: 'orange' },
  { key: 'onTheWay', label: 'On the way', icon: Route, tone: 'violet' },
  { key: 'deliveredToday', label: 'Delivered today', icon: CheckCircle2, tone: 'emerald' },
  { key: 'cancelledToday', label: 'Cancelled', icon: XCircle, tone: 'rose' },
] as const;

type KpiKey = (typeof KPI_CARDS)[number]['key'];

const TONE_STYLES: Record<(typeof KPI_CARDS)[number]['tone'], string> = {
  slate: 'from-slate-700 to-slate-900',
  blue: 'from-blue-600 to-blue-800',
  orange: 'from-orange-500 to-orange-700',
  violet: 'from-violet-600 to-violet-800',
  emerald: 'from-emerald-600 to-emerald-800',
  rose: 'from-rose-600 to-rose-800',
};

function MiniBars({ values, color = 'bg-emerald-400' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  if (!values.length || values.every((value) => value === 0)) {
    return <span className="text-[10px] text-white/50">No trend data</span>;
  }
  return (
    <div className="flex h-7 items-end gap-0.5">
      {values.slice(-12).map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={cn('min-w-1 flex-1 rounded-t-sm opacity-80', color)}
          style={{ height: `${Math.max(10, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: typeof Truck;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {Icon ? <Icon className="h-4 w-4 text-[#14532D]" /> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrderList({
  orders,
  empty,
  pending = false,
}: {
  orders: DeliveryOrderDto[];
  empty: string;
  pending?: boolean;
}) {
  const queryClient = useQueryClient();
  const autoAssign = useMutation({
    mutationFn: (orderId: string) => api.post(`/delivery/orders/${orderId}/auto-assign`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    },
  });
  if (!orders.length) {
    return <p className="px-5 py-8 text-center text-sm text-slate-500">{empty}</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {orders.slice(0, 5).map((order) => {
        const waitingMinutes = Math.max(
          0,
          Math.floor((Date.now() - Date.parse(order.createdAt)) / 60000),
        );
        return (
          <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <Link
                href={`/delivery/orders?search=${encodeURIComponent(order.orderNumber)}`}
                className="font-mono text-xs font-bold hover:text-[#14532D]"
              >
                {order.orderNumber}
              </Link>
              <p className="truncate text-xs text-slate-500">
                {order.customerName} · {order.deliveryAddress || 'Address unavailable'}
              </p>
              {pending ? (
                <p
                  className={cn(
                    'mt-0.5 text-[10px]',
                    waitingMinutes >= 15 ? 'font-bold text-rose-600' : 'text-slate-400',
                  )}
                >
                  Waiting {waitingMinutes} min
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <DeliveryStatusBadge status={order.assignment?.status ?? 'WAITING'} />
              <p className="mt-1 text-xs font-bold text-slate-800">
                {formatCurrency(order.grandTotal)}
              </p>
              {pending ? (
                <div className="mt-2 flex justify-end gap-2">
                  <Link
                    href={`/delivery/assign?search=${encodeURIComponent(order.orderNumber)}`}
                    className="text-[10px] font-bold text-[#14532D] hover:underline"
                  >
                    Assign rider
                  </Link>
                  <button
                    type="button"
                    disabled={autoAssign.isPending}
                    onClick={() => autoAssign.mutate(order.id)}
                    className="text-[10px] font-bold text-amber-700 hover:underline disabled:opacity-50"
                  >
                    Auto assign
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  card,
  value,
  comparison,
  trend,
}: {
  card: (typeof KPI_CARDS)[number];
  value: number;
  comparison?: number | null;
  trend: number[];
}) {
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg',
        TONE_STYLES[card.tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">
          <Icon className="h-4 w-4" />
          {card.label}
        </span>
        <span className="h-2 w-2 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,.8)]" />
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[10px] text-white/65">
          {comparison == null
            ? 'Live operational snapshot'
            : `${comparison >= 0 ? '↑' : '↓'} ${Math.abs(comparison)} vs yesterday`}
        </p>
        <div className="w-20">
          <MiniBars values={trend} color="bg-white" />
        </div>
      </div>
    </motion.div>
  );
}

function ActiveRiderList({ data }: { data: DeliveryDashboardDto }) {
  const riders = data.executives;
  return (
    <div className="divide-y divide-slate-100">
      {riders.length ? (
        riders.map((rider) => (
          <div key={rider.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-xl',
                  ['ONLINE', 'BUSY'].includes(rider.status)
                    ? 'bg-emerald-50 text-[#14532D]'
                    : 'bg-slate-100 text-slate-400',
                )}
              >
                <Truck className="h-4 w-4" />
                <span
                  className={cn(
                    'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
                    ['ONLINE', 'BUSY'].includes(rider.status) ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{rider.name}</p>
                <p className="text-[11px] text-slate-500">
                  {rider.status === 'BUSY'
                    ? 'On an active delivery'
                    : rider.status === 'ONLINE'
                      ? 'Available'
                      : rider.status.replaceAll('_', ' ')}
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              <p>{rider.employeeId}</p>
              {rider.currentLat != null && rider.currentLng != null ? (
                <p className="mt-0.5 font-medium text-emerald-600">GPS active</p>
              ) : (
                <p className="mt-0.5">Location unavailable</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-500">No active riders right now.</p>
      )}
    </div>
  );
}

export function DeliveryCommandCenter({
  data,
  loading,
  onRefresh,
  refreshing,
}: {
  data?: DeliveryDashboardDto;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [fullscreen, setFullscreen] = useState(false);
  const activeOrders = useMemo(
    () =>
      (data?.pendingOrders ?? []).filter(
        (order) =>
          order.status === 'READY' ||
          ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.assignment?.status ?? ''),
      ),
    [data?.pendingOrders],
  );
  const orderIds = activeOrders.map((order) => order.id);
  const live = useDeliveryLiveUpdates(orderIds);
  const selectedOrder =
    activeOrders.find((order) => order.id === selectedOrderId) ?? activeOrders[0];
  const timeline = useQuery({
    queryKey: ['delivery-dashboard-timeline', selectedOrder?.id],
    queryFn: () =>
      api.get<{ type: string; description: string; createdAt: string }[]>(
        `/delivery/orders/${selectedOrder!.id}/timeline`,
      ),
    enabled: Boolean(selectedOrder?.id),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (selectedOrderId && activeOrders.some((order) => order.id === selectedOrderId)) return;
    setSelectedOrderId(activeOrders[0]?.id ?? null);
  }, [activeOrders, selectedOrderId]);

  useEffect(() => {
    const handleFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {KPI_CARDS.map((card) => (
          <div key={card.key} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  const waitingOrders = data.pendingOrders.filter(
    (order) => order.status === 'READY' && !order.assignment,
  );
  const mapOrders = activeOrders.filter(
    (order) =>
      (order.deliveryLatitude != null && order.deliveryLongitude != null) ||
      (order.assignment?.latitude != null && order.assignment.longitude != null),
  );
  const hourlyDeliveries = data.performance?.hourly.map((point) => point.deliveries) ?? [];
  const hourlyRevenue = data.performance?.hourly.map((point) => point.revenue) ?? [];
  const hourlyDeliveryTimes =
    data.performance?.hourly.map((point) => point.averageMinutes ?? 0) ?? [];
  const performanceDelta =
    data.stats.avgDeliveryMinutes != null &&
    data.performance?.averageDeliveryMinutesYesterday != null
      ? data.stats.avgDeliveryMinutes - data.performance.averageDeliveryMinutesYesterday
      : null;
  const selectedDestination =
    selectedOrder?.deliveryLatitude != null && selectedOrder.deliveryLongitude != null
      ? `${selectedOrder.deliveryLatitude},${selectedOrder.deliveryLongitude}`
      : null;

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div className={cn('space-y-5', fullscreen && 'min-h-screen bg-slate-50 p-5 lg:p-7')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Delivery Command Center
            </h1>
            <Badge className={cn('gap-1.5', live.connected ? 'bg-emerald-600' : 'bg-amber-500')}>
              <Radio className={cn('h-3 w-3', live.connected && 'animate-pulse')} />
              {live.connected ? 'LIVE' : 'RECONNECTING'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time delivery operations powered by persisted orders, GPS, and status history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 bg-white px-3 py-2 text-slate-600">
            <CalendarDays className="h-3.5 w-3.5" /> {todayLabel}
          </Badge>
          <Button variant="outline" onClick={onRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /> Refresh
          </Button>
          <Button variant="outline" onClick={() => void toggleFullscreen()} className="gap-2">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {fullscreen ? 'Exit full screen' : 'Full screen'}
            </span>
          </Button>
        </div>
      </div>

      {live.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {live.error}. Reconnecting…
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map((card) => (
          <KpiCard
            key={card.key}
            card={card}
            value={data.stats[card.key as KpiKey]}
            comparison={
              card.key === 'deliveredToday' && data.stats.deliveredYesterday != null
                ? data.stats.deliveredToday - data.stats.deliveredYesterday
                : card.key === 'cancelledToday' && data.stats.cancelledYesterday != null
                  ? data.stats.cancelledToday - data.stats.cancelledYesterday
                  : null
            }
            trend={card.key === 'deliveredToday' ? hourlyDeliveries : []}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Average delivery time"
          icon={Timer}
          className="bg-gradient-to-br from-emerald-50 to-white"
        >
          <div className="p-5">
            <p className="text-3xl font-black text-[#14532D]">
              {data.stats.avgDeliveryMinutes != null ? `${data.stats.avgDeliveryMinutes} min` : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {performanceDelta == null
                ? 'No previous-day comparison available'
                : `${performanceDelta <= 0 ? '↓' : '↑'} ${Math.abs(performanceDelta)} min vs yesterday`}
            </p>
            <div className="mt-4 rounded-lg bg-[#14532D]/10 p-2">
              <MiniBars values={hourlyDeliveryTimes} color="bg-[#14532D]" />
            </div>
          </div>
        </SectionCard>
        <SectionCard
          title="Delivered sales today"
          icon={IndianRupee}
          className="bg-gradient-to-br from-amber-50 to-white"
        >
          <div className="p-5">
            <p className="text-3xl font-black text-amber-700">
              {formatCurrency(data.stats.deliveryRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Completed delivery orders only</p>
            <div className="mt-4 rounded-lg bg-amber-100/70 p-2">
              <MiniBars values={hourlyRevenue} color="bg-amber-500" />
            </div>
          </div>
        </SectionCard>
        <SectionCard
          title="On-time delivery"
          icon={CheckCircle2}
          className="bg-gradient-to-br from-blue-50 to-white"
        >
          <div className="flex items-center gap-5 p-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-8 border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500">N/A</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">SLA not configured</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                No promised delivery deadline is stored, so an on-time percentage is not shown.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <SectionCard
          title="Live delivery map"
          icon={MapPin}
          action={
            <Badge variant="outline">
              {data.stats.onlineRiders} online · {mapOrders.length} mapped
            </Badge>
          }
        >
          <div className="p-3">
            {mapOrders.length ? (
              <div className="h-[390px] overflow-hidden rounded-xl bg-slate-100">
                <DeliveryLiveMap
                  orders={mapOrders}
                  mapType={mapType}
                  onMapTypeChange={setMapType}
                  selectedOrderId={selectedOrder?.id}
                  onSelectOrder={setSelectedOrderId}
                />
              </div>
            ) : (
              <div className="flex h-[390px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
                <MapPin className="h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-600">No mapped deliveries</p>
                <p className="mt-1 text-xs text-slate-400">
                  Customer or rider GPS coordinates are unavailable.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Live order"
          icon={Route}
          action={
            selectedOrder ? (
              <DeliveryStatusBadge status={selectedOrder.assignment?.status ?? 'WAITING'} />
            ) : null
          }
        >
          {selectedOrder ? (
            <div className="p-5">
              <p className="font-mono text-sm font-black text-[#14532D]">
                {selectedOrder.orderNumber}
              </p>
              <p className="mt-1 font-semibold text-slate-800">{selectedOrder.customerName}</p>
              <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-slate-500">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{' '}
                {selectedOrder.deliveryAddress || 'Address unavailable'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Distance</p>
                  <p className="mt-1 font-bold">
                    {selectedOrder.assignment?.distanceKm != null
                      ? `${Number(selectedOrder.assignment.distanceKm).toFixed(1)} km`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">ETA</p>
                  <p className="mt-1 font-bold">
                    {selectedOrder.assignment?.etaMinutes != null
                      ? `${selectedOrder.assignment.etaMinutes} min`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <Users className="h-4 w-4 text-[#14532D]" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700">Rider</p>
                  <p className="truncate text-sm font-bold text-[#14532D]">
                    {selectedOrder.assignment?.executive?.name ?? 'Not assigned'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedDestination ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://www.openstreetmap.org/?mlat=${selectedOrder.deliveryLatitude}&mlon=${selectedOrder.deliveryLongitude}#map=16/${selectedOrder.deliveryLatitude}/${selectedOrder.deliveryLongitude}`,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                  >
                    <Navigation className="mr-1.5 h-3.5 w-3.5" /> Navigate
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedOrder.customerPhone}
                  onClick={() => window.open(`tel:${selectedOrder.customerPhone}`, '_self')}
                >
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Customer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedOrder.assignment?.executive?.phone}
                  onClick={() =>
                    window.open(`tel:${selectedOrder.assignment?.executive?.phone ?? ''}`, '_self')
                  }
                >
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Rider
                </Button>
                <Link
                  href={`/delivery/orders?search=${encodeURIComponent(selectedOrder.orderNumber)}`}
                  className="inline-flex h-9 items-center rounded-md bg-[#14532D] px-3 text-sm font-medium text-white hover:bg-[#0f3d21]"
                >
                  View order <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Delivery timeline
                </p>
                {timeline.isLoading ? (
                  <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
                ) : (
                  <DeliveryTimeline events={timeline.data ?? []} compact />
                )}
              </div>
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              No active deliveries right now.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={`Pending assignments · ${waitingOrders.length}`}
          icon={Clock3}
          action={
            <Link href="/delivery/assign" className="text-xs font-semibold text-[#14532D]">
              Assign orders <ExternalLink className="ml-1 inline h-3 w-3" />
            </Link>
          }
        >
          <OrderList orders={waitingOrders} pending empty="All ready orders have been assigned." />
        </SectionCard>
        <SectionCard
          title="Active riders"
          icon={Truck}
          action={
            <Link href="/delivery/executives" className="text-xs font-semibold text-[#14532D]">
              View all <ExternalLink className="ml-1 inline h-3 w-3" />
            </Link>
          }
        >
          <ActiveRiderList data={data} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Top delivery executives"
          icon={Users}
          action={
            <Link href="/delivery/executives" className="text-xs font-semibold text-[#14532D]">
              View all <ExternalLink className="ml-1 inline h-3 w-3" />
            </Link>
          }
        >
          <div className="divide-y divide-slate-100">
            {data.executives.length ? (
              data.executives.slice(0, 5).map((rider, index) => (
                <div key={rider.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-black text-amber-600">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{rider.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {rider.totalDeliveries} completed deliveries
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-600">★ {rider.rating.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-400">{rider.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No executives yet.</p>
            )}
          </div>
        </SectionCard>
        <SectionCard
          title="Recent deliveries"
          icon={CheckCircle2}
          action={
            <Link
              href="/delivery/orders?status=delivered"
              className="text-xs font-semibold text-[#14532D]"
            >
              View all <ExternalLink className="ml-1 inline h-3 w-3" />
            </Link>
          }
        >
          <OrderList orders={data.recentDeliveries} empty="No completed deliveries today." />
        </SectionCard>
        <SectionCard title="Delivery alerts" icon={AlertTriangle}>
          {data.alerts?.length ? (
            <div className="divide-y divide-slate-100">
              {data.alerts.slice(0, 5).map((alert) => (
                <div key={`${alert.orderId}-${alert.createdAt}`} className="px-5 py-3">
                  <p className="text-xs font-semibold leading-5 text-rose-700">{alert.message}</p>
                  <Link
                    href={`/delivery/orders?search=${encodeURIComponent(alert.orderNumber)}`}
                    className="mt-1 inline-flex items-center text-[11px] font-bold text-[#14532D]"
                  >
                    View order <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No active delivery alerts.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
