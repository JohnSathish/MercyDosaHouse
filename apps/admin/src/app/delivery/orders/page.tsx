'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryOrderDto, DeliveryExecutiveDetailDto } from '@mdh/types';
import { DeliveryOrdersTable } from '@/components/delivery/delivery-orders-table';
import { Button } from '@mdh/ui';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'on_the_way', label: 'On The Way' },
  { value: 'delivered', label: 'Delivered' },
];

export default function DeliveryOrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-orders', status, search],
    queryFn: () =>
      api.get<DeliveryOrderDto[]>(
        `/delivery/orders/list?${new URLSearchParams({ ...(status && { status }), ...(search && { search }) })}`,
      ),
    refetchInterval: 20_000,
  });

  const { data: executives = [] } = useQuery({
    queryKey: ['delivery-executives'],
    queryFn: () => api.get<DeliveryExecutiveDetailDto[]>('/delivery/executives'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, staffId }: { orderId: string; staffId: string }) =>
      api.post(`/delivery/orders/${orderId}/assign`, { staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/delivery/orders/${orderId}/auto-assign`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#14532D]" />
            Delivery Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all delivery orders</p>
        </div>
        <input
          type="search"
          placeholder="Search order, customer, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm w-full sm:w-64 bg-white dark:bg-gray-900"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? 'default' : 'outline'}
            className={status === f.value ? 'bg-[#14532D]' : ''}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <DeliveryOrdersTable
        orders={orders}
        executives={executives}
        loading={isLoading}
        onAssign={(orderId, staffId) => assignMutation.mutate({ orderId, staffId })}
        onAutoAssign={(orderId) => autoAssignMutation.mutate(orderId)}
      />
    </div>
  );
}
