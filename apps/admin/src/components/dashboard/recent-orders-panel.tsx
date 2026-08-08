'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock } from 'lucide-react';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import type { OrderDto } from '@mdh/types';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@mdh/ui';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function RecentOrdersPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => api.get<{ data: OrderDto[]; total: number }>('/orders?limit=5'),
    refetchInterval: 30000,
  });

  const orders = data?.data ?? [];

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <Link
          href="/orders"
          className="text-xs text-[#14532D] font-medium flex items-center gap-1 hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}
        {!isLoading && orders.length === 0 && (
          <p className="text-sm text-muted-foreground">No orders yet today.</p>
        )}
        {orders.map((order) => (
          <Link
            key={order.id}
            href="/orders"
            className="flex items-start justify-between gap-3 rounded-xl border p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">#{order.orderNumber}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${STATUS_COLORS[order.status] ?? ''}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{order.customerName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-sm">{formatCurrency(order.grandTotal)}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
