'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import { cn } from '@mdh/ui';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/relative-time';
import {
  INBOX_KEY,
  UNREAD_KEY,
  useInboxPreview,
  useUnreadCount,
} from '@/lib/use-notifications-inbox';

export function NotificationBell({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: unread } = useUnreadCount();
  const { data: inbox } = useInboxPreview(8);
  const unreadCount = unread?.unreadCount ?? inbox?.unreadCount ?? 0;
  const items = inbox?.data ?? [];

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 max-md:h-11 max-md:w-11"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 max-md:h-4 max-md:w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute right-2 top-full z-50 mt-2 w-[min(calc(100vw-1rem),22rem)] overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 md:right-4 lg:right-8">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-[#0B3D24] min-h-[44px] px-2"
                    onClick={() => markAll.mutate()}
                  >
                    Mark all as read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="min-h-[44px] min-w-[44px] p-2"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!items.length ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium">You&apos;re all caught up</p>
                  <p className="mt-1 text-xs text-muted-foreground">No new notifications.</p>
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'w-full border-b px-4 py-3 text-left last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50',
                      !n.isRead && 'bg-[#0B3D24]/5',
                    )}
                    onClick={() => {
                      if (!n.isRead) void markRead.mutate(n.id);
                      onOpenChange(false);
                      router.push(n.href || '/notifications');
                    }}
                  >
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {n.body}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
            <Link
              href="/notifications"
              onClick={() => onOpenChange(false)}
              className="block border-t px-4 py-3 text-center text-sm font-medium text-[#0B3D24] dark:border-gray-700"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
