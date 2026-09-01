'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@mdh/ui';
import { api } from '@/lib/api';
import type { InboxCategory, InboxListDto, InboxNotificationDto } from '@mdh/types';
import { formatRelativeTime, inboxDayGroup } from '@/lib/relative-time';
import { INBOX_KEY, UNREAD_KEY } from '@/lib/use-notifications-inbox';

const TABS: { key: 'ALL' | InboxCategory; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ORDER', label: 'Orders' },
  { key: 'PAYMENT', label: 'Payments' },
  { key: 'INVENTORY', label: 'Inventory' },
  { key: 'CUSTOMER', label: 'Customers' },
  { key: 'DELIVERY', label: 'Delivery' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [category, setCategory] = useState<(typeof TABS)[number]['key']>('ALL');
  const [read, setRead] = useState<'all' | 'unread' | 'read'>('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    limit: '20',
    category,
  });
  if (read !== 'all') params.set('read', read);
  if (q.trim()) params.set('q', q.trim());
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const { data, isLoading } = useQuery({
    queryKey: [...INBOX_KEY, 'page', params.toString()],
    queryFn: () => api.get<InboxListDto>(`/notifications/inbox?${params.toString()}`),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });

  const grouped = useMemo(() => {
    const map: Record<'Today' | 'Yesterday' | 'Earlier', InboxNotificationDto[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    for (const row of data?.data ?? []) {
      map[inboxDayGroup(row.createdAt)].push(row);
    }
    return map;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live events from Mercy Dosa House operations.
            {data ? ` ${data.unreadCount} unread.` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setCategory(tab.key);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              category === tab.key
                ? 'border-[#0B3D24] bg-[#0B3D24] text-white'
                : 'border-gray-200 bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setRead(key);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm ${
              read === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {key === 'unread' ? '🔴 Unread' : key === 'read' ? '🟢 Read' : 'All statuses'}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Search notifications"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-4 space-y-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!isLoading && !data?.data.length ? (
            <div className="py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">You&apos;re all caught up</p>
              <p className="text-sm text-muted-foreground">No new notifications.</p>
            </div>
          ) : null}
          {(['Today', 'Yesterday', 'Earlier'] as const).map((label) =>
            grouped[label]?.length ? (
              <section key={label}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {label}
                </h2>
                <div className="space-y-2">
                  {grouped[label].map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        n.isRead ? 'border-gray-100' : 'border-amber-200 bg-amber-50/40'
                      }`}
                      onClick={() => {
                        if (!n.isRead) void markRead.mutate(n.id);
                        router.push(n.href || '/notifications');
                      }}
                    >
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            ) : null,
          )}
          {data && data.total > data.limit ? (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="self-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
