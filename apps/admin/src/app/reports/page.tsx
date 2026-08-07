'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const { data: daily } = useQuery({
    queryKey: ['report-daily'],
    queryFn: () => api.get<{ date: string; orderCount: number; revenue: number }>('/reports/daily'),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['report-top'],
    queryFn: () =>
      api.get<{ name: string; quantity: number; revenue: number }[]>('/reports/top-products'),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Date: {daily?.date}</p>
            <p>Orders: {daily?.orderCount ?? '—'}</p>
            <p>Revenue: {daily ? formatCurrency(daily.revenue) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topProducts?.map((p) => (
                <li key={p.name} className="flex justify-between">
                  <span>{p.name}</span>
                  <span>
                    {p.quantity} sold — {formatCurrency(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
