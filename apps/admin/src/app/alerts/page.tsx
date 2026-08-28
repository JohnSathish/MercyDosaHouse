'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button, Card, CardContent } from '@mdh/ui';
import { api } from '@/lib/api';

type AlertItem = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: { orderId?: string; orderNumber?: string } | null;
};

export default function OrderAlertsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: () => api.get<AlertItem[]>('/notifications'),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-alerts'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-alerts'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Order Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            New orders and status history for your account.
          </p>
        </div>
        <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {data.map((n) => {
            const orderId = n.data?.orderId;
            return (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left rounded-xl border px-3 py-3 ${
                  n.isRead ? 'border-gray-100' : 'border-amber-200 bg-amber-50/40'
                }`}
                onClick={() => {
                  void markRead.mutate(n.id);
                  if (orderId && orderId !== 'test') router.push(`/orders?orderId=${orderId}`);
                }}
              >
                <div className="flex items-start gap-2">
                  <Bell className="h-4 w-4 mt-0.5 text-[#0B3D24]" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {!isLoading && !data.length ? (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
