'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import type { OrderDto } from '@mdh/types';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@mdh/ui';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  ACCEPTED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  PREPARING: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  READY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

export function RecentOrdersTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => api.get<{ data: OrderDto[]; total: number }>('/orders?limit=12'),
    refetchInterval: 30000,
  });

  const orders = data?.data ?? [];

  return (
    <Card className="border-0 shadow-sm w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <Link href="/orders">
          <Button variant="ghost" size="sm" className="gap-1 text-[#14532D]">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile card view */}
        <div className="md:hidden divide-y">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          {!isLoading && orders.length === 0 && (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              No orders yet today.
            </p>
          )}
          {orders.map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[#14532D]">#{order.orderNumber}</p>
                  <p className="text-sm font-medium truncate">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${STATUS_COLORS[order.status] ?? ''}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold">{formatCurrency(order.grandTotal)}</p>
                <Link href="/orders">
                  <Button size="sm" variant="outline" className="min-h-[44px]">
                    Manage
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Items</th>
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Time</th>
                <th className="px-4 py-3 font-semibold hidden 2xl:table-cell">Delivery</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No orders yet today.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    #{order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[140px]">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
                    <p className="truncate text-muted-foreground text-xs">
                      {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-xs font-medium">{order.paymentMethod}</span>
                    <p className="text-[10px] text-muted-foreground">{order.paymentStatus}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${STATUS_COLORS[order.status] ?? ''}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 hidden 2xl:table-cell text-xs text-muted-foreground max-w-[160px] truncate">
                    {order.deliveryAddress}
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    {formatCurrency(order.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href="/orders">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Manage
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
