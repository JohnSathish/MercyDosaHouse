'use client';

import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { Button, Badge } from '@mdh/ui';

const REPORTS = [
  {
    id: 'delivery',
    label: 'Delivery Report',
    description: 'All deliveries with status and timing',
  },
  { id: 'executive', label: 'Executive Report', description: 'Per-rider performance and earnings' },
  {
    id: 'performance',
    label: 'Performance Report',
    description: 'Success rate, avg time, ratings',
  },
  { id: 'distance', label: 'Distance Report', description: 'Total distance covered by zone' },
  { id: 'revenue', label: 'Revenue Report', description: 'Delivery revenue and charges collected' },
  { id: 'cancelled', label: 'Cancelled Report', description: 'Cancelled deliveries with reasons' },
];

export default function DeliveryReportsPage() {
  const { data } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
  });

  function exportCsv(type: string) {
    const rows = [
      ['Report', type],
      ['Delivered Today', String(data?.stats.deliveredToday ?? 0)],
      ['Cancelled Today', String(data?.stats.cancelledToday ?? 0)],
      ['Avg Delivery Time (min)', String(data?.stats.avgDeliveryMinutes ?? 0)],
      ['Revenue', String(data?.stats.deliveryRevenue ?? 0)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-[#14532D]" />
          Delivery Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Generate and export delivery reports</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Delivered Today" value={String(data?.stats.deliveredToday ?? '—')} />
        <StatCard label="Avg Time" value={`${data?.stats.avgDeliveryMinutes ?? '—'} min`} />
        <StatCard label="Revenue" value={formatCurrency(data?.stats.deliveryRevenue ?? 0)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{r.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                CSV
              </Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCsv(r.id)}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
