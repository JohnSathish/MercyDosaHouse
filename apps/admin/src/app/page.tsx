'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { DashboardStatsDto } from '@mdh/types';

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStatsDto>('/dashboard/stats'),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Orders Today', value: stats?.ordersToday ?? '—' },
          { label: 'Revenue Today', value: stats ? formatCurrency(stats.revenueToday) : '—' },
          { label: 'Pending Orders', value: stats?.pendingOrders ?? '—' },
          { label: 'Customers Today', value: stats?.customersToday ?? '—' },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.popularItems && stats.popularItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Items Today</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.popularItems.map((item) => (
                <li key={item.name} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{item.count} orders</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
