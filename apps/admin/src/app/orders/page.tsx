'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardContent } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import type { OrderDto } from '@mdh/types';
import { OrderStatus } from '@mdh/types';

export default function OrdersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get<{ data: OrderDto[] }>('/orders'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const confirmPayment = useMutation({
    mutationFn: (id: string) => api.patch(`/orders/${id}/confirm-payment`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  if (isLoading) return <p>Loading orders...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="space-y-4">
        {data?.data.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                <div>
                  <p className="font-bold">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} — {order.customerPhone}
                  </p>
                  <p className="text-sm">{order.deliveryAddress}</p>
                </div>
                <div className="text-right">
                  <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  <p className="font-bold mt-1">{formatCurrency(order.grandTotal)}</p>
                  <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate({ id: order.id, status: OrderStatus.ACCEPTED })
                    }
                  >
                    Accept
                  </Button>
                )}
                {order.status === 'ACCEPTED' && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate({ id: order.id, status: OrderStatus.PREPARING })
                    }
                  >
                    Preparing
                  </Button>
                )}
                {order.status === 'PREPARING' && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: order.id, status: OrderStatus.READY })}
                  >
                    Ready
                  </Button>
                )}
                {order.status === 'READY' && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate({ id: order.id, status: OrderStatus.OUT_FOR_DELIVERY })
                    }
                  >
                    Out for Delivery
                  </Button>
                )}
                {order.status === 'OUT_FOR_DELIVERY' && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate({ id: order.id, status: OrderStatus.DELIVERED })
                    }
                  >
                    Delivered
                  </Button>
                )}
                {order.paymentMethod === 'UPI' && order.paymentStatus === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => confirmPayment.mutate(order.id)}
                  >
                    Confirm UPI Payment
                  </Button>
                )}
                {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      updateStatus.mutate({ id: order.id, status: OrderStatus.CANCELLED })
                    }
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
