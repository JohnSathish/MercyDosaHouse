'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Users,
} from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { DashboardStatsDto } from '@mdh/types';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting';
import { MiniBarChart } from '@/components/dashboard/mini-bar-chart';
import { RecentOrdersTable } from '@/components/dashboard/recent-orders-table';
import { NotificationsFeed } from '@/components/dashboard/notifications-feed';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { RestaurantStatusPanel } from '@/components/dashboard/restaurant-status-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@mdh/ui';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStatsDto>('/dashboard/stats'),
    refetchInterval: 30000,
  });

  if (isLoading && !stats) {
    return <DashboardSkeleton />;
  }

  const primaryKpis = [
    {
      label: "Today's Orders",
      value: stats?.ordersToday ?? '—',
      icon: ShoppingBag,
      accent: 'green' as const,
    },
    {
      label: "Today's Revenue",
      value: stats ? formatCurrency(stats.revenueToday) : '—',
      icon: IndianRupee,
      accent: 'orange' as const,
    },
    {
      label: 'Pending',
      value: stats?.pendingOrders ?? '—',
      icon: Clock,
      accent: 'orange' as const,
    },
    {
      label: 'Preparing',
      value: stats?.preparingOrders ?? '—',
      icon: ChefHat,
      accent: 'blue' as const,
    },
    {
      label: 'Delivered',
      value: stats?.deliveredToday ?? '—',
      icon: CheckCircle2,
      accent: 'green' as const,
    },
    {
      label: 'Cancelled',
      value: stats?.cancelledOrders ?? '—',
      icon: XCircle,
      accent: 'red' as const,
    },
    {
      label: 'Weekly Revenue',
      value: stats ? formatCurrency(stats.revenueWeek) : '—',
      icon: IndianRupee,
      accent: 'purple' as const,
    },
    {
      label: 'Monthly Revenue',
      value: stats ? formatCurrency(stats.revenueMonth) : '—',
      icon: IndianRupee,
      accent: 'purple' as const,
    },
    {
      label: 'Customers Today',
      value: stats?.customersToday ?? '—',
      icon: Users,
      accent: 'blue' as const,
    },
    {
      label: 'Sales Today',
      value: stats?.salesToday ?? '—',
      icon: ShoppingBag,
      accent: 'green' as const,
    },
  ];

  const orderChartData = [
    { label: 'Pending', value: stats?.pendingOrders ?? 0 },
    { label: 'Prep', value: stats?.preparingOrders ?? 0 },
    { label: 'Ready', value: stats?.readyOrders ?? 0 },
    { label: 'Delivery', value: stats?.outForDeliveryOrders ?? 0 },
    { label: 'Done', value: stats?.deliveredToday ?? 0 },
  ];

  const revenueChartData = [
    { label: 'Today', value: stats?.revenueToday ?? 0 },
    { label: 'Week', value: Math.round((stats?.revenueWeek ?? 0) / 7) },
    { label: 'Month', value: Math.round((stats?.revenueMonth ?? 0) / 30) },
    { label: 'Avg/Day', value: stats?.revenueToday ?? 0 },
  ];

  return (
    <div className="w-full min-h-full space-y-6">
      <DashboardGreeting />

      <RestaurantStatusPanel />

      {/* KPI grid — 2 columns on phones, scales up on larger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 w-full">
        {primaryKpis.map((item) => (
          <StatCard key={item.label} {...item} trend="Live" />
        ))}
      </div>

      {/* Charts + best sellers — fluid columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
        <MiniBarChart title="Orders by Status" data={orderChartData} color="#14532D" />
        <MiniBarChart title="Revenue Overview (₹)" data={revenueChartData} color="#F59E0B" />
        <Card className="border-0 shadow-sm w-full md:col-span-2 xl:col-span-1 2xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Most Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.popularItems && stats.popularItems.length > 0 ? (
              <ul className="space-y-3">
                {stats.popularItems.map((item, i) => (
                  <li key={item.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14532D]/10 text-xs font-bold text-[#14532D]">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (item.count / (stats.popularItems[0]?.count || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#14532D]">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No sales data yet today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full-width orders table */}
      <RecentOrdersTable />

      {/* Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 w-full">
        <div className="xl:col-span-1 2xl:col-span-2">
          <NotificationsFeed />
        </div>
      </div>
    </div>
  );
}
