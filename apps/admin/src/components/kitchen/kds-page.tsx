'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Volume2, VolumeX, ChefHat } from 'lucide-react';
import { Button, cn } from '@mdh/ui';
import { api } from '@/lib/api';
import { useKitchenSocket } from '@/lib/use-kitchen-socket';
import { useToastStore } from '@/lib/toast-store';
import type {
  KitchenItemStatus,
  KitchenDashboardDto,
  KitchenOrderDto,
  KitchenStationDto,
  KitchenStatusFilter,
} from '@mdh/types';
import { KdsStatsBar, KdsLiveIndicator } from './kds-stats';
import { KdsFilters } from './kds-filters';
import { KitchenOrderCard } from './kitchen-order-card';
import { KitchenOrderDrawer } from './kitchen-order-drawer';
import { OrderCardMotion } from './priority-badge';

export function KdsPageClient() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [status, setStatus] = useState<KitchenStatusFilter>('all');
  const [station, setStation] = useState('all');
  const [search, setSearch] = useState('');
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrderDto | null>(null);

  useKitchenSocket(muted);

  useEffect(() => {
    const stored = localStorage.getItem('kds-muted');
    if (stored === 'true') setMuted(true);
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      localStorage.setItem('kds-muted', String(!m));
      return !m;
    });
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const { data: stations = [] } = useQuery({
    queryKey: ['kds-stations'],
    queryFn: () => api.get<KitchenStationDto[]>('/kitchen/stations'),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['kds-dashboard', status, station, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (station !== 'all') params.set('station', station);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString();
      return api.get<KitchenDashboardDto>(`/kitchen/dashboard${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 15_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kds-dashboard'] });

  const actionMutation = useMutation({
    mutationFn: async ({ action, orderId }: { action: string; orderId: string }) => {
      switch (action) {
        case 'accept':
          return api.patch(`/kitchen/orders/${orderId}/accept`);
        case 'reject':
          return api.patch(`/kitchen/orders/${orderId}/reject`, { reason: 'Rejected by kitchen' });
        case 'preparing':
          return api.patch(`/kitchen/orders/${orderId}/preparing`, { trackingStatus: 'COOKING' });
        case 'ready':
          return api.patch(`/kitchen/orders/${orderId}/ready`);
        case 'complete':
          return api.patch(`/kitchen/orders/${orderId}/complete`);
        default:
          throw new Error('Unknown action');
      }
    },
    onMutate: async ({ action, orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['kds-dashboard'] });
      const prev = queryClient.getQueryData<KitchenDashboardDto>([
        'kds-dashboard',
        status,
        station,
        search,
      ]);
      if (prev) {
        const statusMap: Record<string, string> = {
          accept: 'ACCEPTED',
          preparing: 'PREPARING',
          ready: 'READY',
        };
        const newStatus = statusMap[action];
        if (newStatus) {
          queryClient.setQueryData<KitchenDashboardDto>(
            ['kds-dashboard', status, station, search],
            {
              ...prev,
              orders: prev.orders.map((o) =>
                o.id === orderId ? { ...o, status: newStatus as KitchenOrderDto['status'] } : o,
              ),
            },
          );
        }
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['kds-dashboard', status, station, search], ctx.prev);
      }
      toast('Action failed. Please try again.');
    },
    onSuccess: (_data, { action }) => {
      toast(`Order ${action} successful`);
      invalidate();
    },
  });

  const itemStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      itemId,
      kitchenStatus,
    }: {
      orderId: string;
      itemId: string;
      kitchenStatus: KitchenItemStatus;
    }) => api.patch(`/kitchen/orders/${orderId}/items/${itemId}/status`, { kitchenStatus }),
    onSuccess: () => invalidate(),
  });

  const handleAction = useCallback(
    (action: string, orderId: string) => {
      actionMutation.mutate({ action, orderId });
    },
    [actionMutation],
  );

  const stats = data?.stats ?? {
    activeOrders: 0,
    preparing: 0,
    ready: 0,
    completedToday: 0,
    avgPrepMinutes: 0,
    overdue: 0,
  };

  const orders = data?.orders ?? [];

  return (
    <div
      className={cn(
        'w-full min-h-full space-y-5',
        fullscreen && 'fixed inset-0 z-[100] bg-gray-950 p-4 lg:p-6 overflow-auto',
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#14532D] flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Kitchen Display System</h1>
            <KdsLiveIndicator count={stats.activeOrders} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
            onClick={toggleMute}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <KdsStatsBar stats={stats} />

      <KdsFilters
        status={status}
        onStatusChange={setStatus}
        station={station}
        onStationChange={setStation}
        search={search}
        onSearchChange={setSearch}
        stations={stations}
      />

      {/* Order grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <ChefHat className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium">No orders in this view</p>
          <p className="text-sm mt-1">New orders will appear here instantly</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <OrderCardMotion key={order.id} priority={order.priority}>
                <KitchenOrderCard
                  order={order}
                  muted={muted}
                  onAction={handleAction}
                  onSelect={setSelectedOrder}
                  isPending={actionMutation.isPending}
                />
              </OrderCardMotion>
            ))}
          </AnimatePresence>
        </div>
      )}

      <KitchenOrderDrawer
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        muted={muted}
        onItemStatus={(orderId, itemId, kitchenStatus) =>
          itemStatusMutation.mutate({ orderId, itemId, kitchenStatus })
        }
      />
    </div>
  );
}
