'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryOrderDto, DeliveryExecutiveDetailDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { Button, Badge } from '@mdh/ui';
import { DeliveryStatusBadge } from '@/components/delivery/delivery-status-badge';

export default function AssignDeliveryPage() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-available'],
    queryFn: () => api.get<DeliveryOrderDto[]>('/delivery/orders/available'),
    refetchInterval: 15_000,
  });

  const { data: executives = [] } = useQuery({
    queryKey: ['delivery-executives'],
    queryFn: () => api.get<DeliveryExecutiveDetailDto[]>('/delivery/executives'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, staffId }: { orderId: string; staffId: string }) =>
      api.post(`/delivery/orders/${orderId}/assign`, { staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/delivery/orders/${orderId}/auto-assign`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    },
  });

  const onlineExecs = executives.filter((e) => e.status === 'ONLINE' || e.status === 'OFFLINE');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-[#14532D]" />
          Assign Delivery
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manually assign or auto-assign nearest available executive
        </p>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-12 text-center text-muted-foreground">
          No orders waiting for assignment. Orders appear here when kitchen marks them READY.
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold">{order.orderNumber}</span>
                    <DeliveryStatusBadge status="WAITING" />
                  </div>
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{formatCurrency(order.grandTotal)}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {order.paymentMethod}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-[#14532D] hover:bg-[#14532D]/90"
                  onClick={() => autoAssignMutation.mutate(order.id)}
                  disabled={autoAssignMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Auto Assign (Nearest)
                </Button>
                <div className="flex flex-wrap gap-2">
                  {onlineExecs.map((e) => (
                    <Button
                      key={e.id}
                      variant="outline"
                      size="sm"
                      onClick={() => assignMutation.mutate({ orderId: order.id, staffId: e.id })}
                      disabled={assignMutation.isPending}
                    >
                      {e.user?.name ?? e.employeeId}
                      <span className="ml-1 text-muted-foreground">({e.activeOrders})</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
