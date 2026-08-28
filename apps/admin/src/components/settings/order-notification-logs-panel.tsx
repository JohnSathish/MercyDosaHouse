'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button, cn } from '@mdh/ui';
import { api } from '@/lib/api';

type OrderNotificationLog = {
  id: string;
  orderNumber: string | null;
  customerName: string | null;
  event: string | null;
  previousStatus: string | null;
  notificationType: string | null;
  status: string;
  error: string | null;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
};

export function OrderNotificationLogsPanel() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['order-notification-logs'],
    queryFn: () => api.get<OrderNotificationLog[]>('/notifications/order-dispatches'),
    refetchInterval: 30_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/order-dispatches/${id}/retry`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-notification-logs'] });
    },
  });

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">Order notification logs</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Audited customer status events and their push-provider result.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notification events…</p>
      ) : null}
      {!isLoading && !data.length ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No customer order notification events yet.
        </p>
      ) : null}
      {data.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <div className="min-w-[720px] divide-y">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_0.8fr] gap-3 bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:bg-gray-950">
              <span>Order / customer</span>
              <span>Event</span>
              <span>Created</span>
              <span>Status</span>
              <span />
            </div>
            {data.map((event) => {
              const failed = !['SENT'].includes(event.status);
              return (
                <div
                  key={event.id}
                  className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_0.8fr] items-center gap-3 px-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono font-semibold">
                      {event.orderNumber ?? 'Unknown order'}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {event.customerName ?? 'Customer unavailable'}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {event.event ?? event.notificationType ?? 'Order update'}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                  <span className={cn('font-bold', failed ? 'text-amber-700' : 'text-emerald-700')}>
                    {failed ? `⚠ ${event.status}` : '✓ Sent'}
                  </span>
                  <div className="text-right">
                    {failed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate(event.id)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" /> Retry
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {event.sentAt ? new Date(event.sentAt).toLocaleTimeString() : ''}
                      </span>
                    )}
                  </div>
                  {event.error ? (
                    <p className="col-span-full text-[11px] text-amber-700">{event.error}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
