'use client';

import { Bell, Package, Star, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@mdh/ui';
import type { DashboardStatsDto } from '@mdh/types';

interface NotificationsFeedProps {
  stats?: DashboardStatsDto;
}

export function NotificationsFeed({ stats }: NotificationsFeedProps) {
  const items = [
    stats?.pendingOrders
      ? {
          icon: Bell,
          color: 'text-orange-600 bg-orange-50',
          message: `${stats.pendingOrders} orders awaiting acceptance`,
          time: 'Live',
        }
      : null,
    stats?.preparingOrders
      ? {
          icon: Package,
          color: 'text-purple-600 bg-purple-50',
          message: `${stats.preparingOrders} orders in kitchen`,
          time: 'Live',
        }
      : null,
    {
      icon: Star,
      color: 'text-amber-600 bg-amber-50',
      message: 'New customer review pending approval',
      time: '1 hr ago',
    },
    {
      icon: CreditCard,
      color: 'text-emerald-600 bg-emerald-50',
      message: `Today's revenue: ₹${stats?.revenueToday?.toLocaleString('en-IN') ?? '—'}`,
      time: 'Updated',
    },
  ].filter(Boolean) as { icon: typeof Bell; color: string; message: string; time: string }[];

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Latest Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className={`rounded-lg p-2 ${item.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{item.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
