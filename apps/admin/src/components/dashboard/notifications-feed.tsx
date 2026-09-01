'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@mdh/ui';
import { formatRelativeTime } from '@/lib/relative-time';
import { useInboxPreview } from '@/lib/use-notifications-inbox';

export function NotificationsFeed() {
  const { data } = useInboxPreview(6);
  const items = data?.data ?? [];

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Latest Notifications</CardTitle>
        <Link href="/notifications" className="text-xs font-medium text-[#0B3D24]">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {!items.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            You&apos;re all caught up. No new notifications.
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href || '/notifications'}
              className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="rounded-lg p-2 bg-[#0B3D24]/10 text-[#0B3D24]">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
