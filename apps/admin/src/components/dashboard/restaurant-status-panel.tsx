'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@mdh/ui';
import { DEFAULT_STORE_CLOSED_MESSAGE, type RestaurantStatusDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';

function useSyncedState(serverValue: string) {
  const [value, setValue] = useState(serverValue);
  const [seed, setSeed] = useState(serverValue);
  if (serverValue !== seed) {
    setValue(serverValue);
    setSeed(serverValue);
  }
  return [value, setValue] as const;
}

export function RestaurantStatusPanel() {
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['restaurant-status'],
    queryFn: () => api.get<RestaurantStatusDto>('/settings/restaurant-status'),
    refetchInterval: 30_000,
  });

  const [closedMessage, setClosedMessage] = useSyncedState(
    status?.storeClosedMessage ?? DEFAULT_STORE_CLOSED_MESSAGE,
  );
  const [reopenMessage, setReopenMessage] = useSyncedState(status?.storeReopenMessage ?? '');
  const [closedReason, setClosedReason] = useSyncedState(status?.storeClosedReason ?? '');

  const mutation = useMutation({
    mutationFn: (payload: {
      storeOpen: boolean;
      storeClosedMessage?: string;
      storeReopenMessage?: string;
      storeClosedReason?: string;
    }) => api.patch<RestaurantStatusDto>('/settings/restaurant-status', payload),
    onSuccess: (next) => {
      queryClient.setQueryData(['restaurant-status'], next);
      toast(next.storeOpen ? 'Restaurant is now OPEN' : 'Restaurant is now CLOSED');
    },
    onError: () => toast('Failed to update restaurant status'),
  });

  if (isLoading && !status) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading status…
        </CardContent>
      </Card>
    );
  }

  const open = status?.storeOpen ?? true;

  return (
    <Card
      className={`border-2 shadow-md ${open ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'}`}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${open ? 'bg-emerald-100' : 'bg-red-100'}`}
            >
              <Store className={`h-6 w-6 ${open ? 'text-emerald-700' : 'text-red-700'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Restaurant Status</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Controls website, mobile app &amp; all online orders
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${open ? 'text-emerald-700' : 'text-red-700'}`}>
              {open ? '🟢 OPEN' : '🔴 CLOSED'}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {open ? 'Accepting orders' : 'Not accepting orders'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={open || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                storeOpen: true,
                storeClosedMessage: closedMessage,
                storeReopenMessage: reopenMessage,
                storeClosedReason: closedReason,
              })
            }
          >
            🟢 Open — Accepting Orders
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!open || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                storeOpen: false,
                storeClosedMessage: closedMessage || DEFAULT_STORE_CLOSED_MESSAGE,
                storeReopenMessage: reopenMessage,
                storeClosedReason: closedReason,
              })
            }
          >
            🔴 Close — Stop New Orders
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="closed-reason">Closing reason (optional)</Label>
            <Input
              id="closed-reason"
              value={closedReason}
              onChange={(e) => setClosedReason(e.target.value)}
              placeholder="e.g. Kitchen maintenance"
            />
          </div>
          <div>
            <Label htmlFor="reopen-message">Reopening message (optional)</Label>
            <Input
              id="reopen-message"
              value={reopenMessage}
              onChange={(e) => setReopenMessage(e.target.value)}
              placeholder="e.g. We'll be back at 3:00 PM"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="closed-message">Customer message when closed</Label>
          <Textarea
            id="closed-message"
            rows={2}
            value={closedMessage}
            onChange={(e) => setClosedMessage(e.target.value)}
            placeholder={DEFAULT_STORE_CLOSED_MESSAGE}
          />
        </div>

        {status?.storeStatusChangedAt ? (
          <p className="text-xs text-muted-foreground">
            Last changed
            {status.storeStatusChangedByName
              ? ` by ${status.storeStatusChangedByName}`
              : ''} on{' '}
            {new Date(status.storeStatusChangedAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              storeOpen: open,
              storeClosedMessage: closedMessage || DEFAULT_STORE_CLOSED_MESSAGE,
              storeReopenMessage: reopenMessage,
              storeClosedReason: closedReason,
            })
          }
        >
          Save messages
        </Button>
      </CardContent>
    </Card>
  );
}
