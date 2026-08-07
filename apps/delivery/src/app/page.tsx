'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Badge } from '@mdh/ui';
import { ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: { productName: string; quantity: number }[];
}

export default function DeliveryPage() {
  const queryClient = useQueryClient();
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});

  const { data: available } = useQuery({
    queryKey: ['delivery-available'],
    queryFn: () => api.get<DeliveryOrder[]>('/delivery/orders/available'),
  });

  const { data: assigned } = useQuery({
    queryKey: ['delivery-assigned'],
    queryFn: () => api.get<DeliveryOrder[]>('/delivery/orders'),
  });

  const assign = useMutation({
    mutationFn: (id: string) => api.patch(`/delivery/orders/${id}/assign`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-assigned'] });
    },
  });

  const deliver = useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) =>
      api.patch(`/delivery/orders/${id}/deliver`, { otp }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-assigned'] }),
  });

  const openMaps = (address: string) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      '_blank',
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold mb-4">Available for Pickup</h2>
        <div className="space-y-3">
          {available?.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                  </div>
                  <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
                </div>
                <Button size="sm" onClick={() => assign.mutate(order.id)}>
                  Assign to Me
                </Button>
              </CardContent>
            </Card>
          ))}
          {available?.length === 0 && (
            <p className="text-muted-foreground">No orders ready for pickup</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">My Deliveries</h2>
        <div className="space-y-3">
          {assigned?.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <p className="font-bold">{order.orderNumber}</p>
                  <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
                </div>
                <p className="text-sm">
                  {order.customerName} — {order.customerPhone}
                </p>
                <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
                <Button size="sm" variant="outline" onClick={() => openMaps(order.deliveryAddress)}>
                  Navigate (Google Maps)
                </Button>
                {order.status === 'OUT_FOR_DELIVERY' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Delivery OTP"
                      value={otpInputs[order.id] || ''}
                      onChange={(e) => setOtpInputs({ ...otpInputs, [order.id]: e.target.value })}
                      className="max-w-[120px]"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        deliver.mutate({ id: order.id, otp: otpInputs[order.id] || '' })
                      }
                    >
                      Confirm Delivered
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
