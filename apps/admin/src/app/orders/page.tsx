'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { OrderDto } from '@mdh/types';
import { OrderStatus } from '@mdh/types';
import { OrdersTable } from '@/components/orders/orders-table';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () =>
      api.get<{ data: OrderDto[]; total: number }>(
        statusFilter ? `/orders?status=${statusFilter}&limit=100` : '/orders?limit=100',
      ),
  });

  const orders = data?.data ?? [];

  const invalidateOrderQueries = (orderId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
    }
  };

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<OrderDto>(`/orders/${id}/status`, {
        status,
        ...(status === OrderStatus.PREPARING ? { trackingStatus: 'PREPARING' } : {}),
        ...(status === OrderStatus.READY ? { trackingStatus: 'PACKING' } : {}),
        ...(status === OrderStatus.OUT_FOR_DELIVERY ? { trackingStatus: 'OUT_FOR_DELIVERY' } : {}),
        ...(status === OrderStatus.DELIVERED ? { trackingStatus: 'DELIVERED' } : {}),
        ...(status === OrderStatus.ACCEPTED ? { trackingStatus: 'ACCEPTED' } : {}),
      }),
    onSuccess: (updated, { id, status }) => {
      queryClient.setQueryData(['admin-order', id], updated);
      invalidateOrderQueries(id);
      toast(`Order marked as ${ORDER_STATUS_LABELS[status]}`);
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Failed to update order status');
    },
  });

  const rejectOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch<OrderDto>(`/orders/${id}/reject`, { reason }),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['admin-order', id], updated);
      invalidateOrderQueries(id);
      toast('Order rejected');
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Failed to reject order');
    },
  });

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await updateStatus.mutateAsync({ id, status });
  };

  if (isLoading) return <p>Loading orders...</p>;
  if (isError) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Order Management</h1>
        <p className="text-destructive">
          Failed to load orders: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders.length} orders loaded</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm bg-white"
        >
          <option value="">All statuses</option>
          {Object.values(OrderStatus).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <OrdersTable
        orders={orders}
        loading={updateStatus.isPending || rejectOrder.isPending}
        onStatusChange={handleStatusChange}
        onReject={(id, reason) => rejectOrder.mutate({ id, reason })}
      />
    </div>
  );
}
