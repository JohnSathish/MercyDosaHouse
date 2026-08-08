'use client';

import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { InventoryAnalyticsDto } from '@mdh/types';

export default function InventoryReportsPage() {
  const { data } = useQuery({
    queryKey: ['reports-inventory'],
    queryFn: () => api.get<InventoryAnalyticsDto>('/reports/inventory'),
  });

  if (!data) return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Package className="h-6 w-6 text-[#14532D]" /> Inventory Analytics
      </h1>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Stock Value</p>
          <p className="text-2xl font-bold">{formatCurrency(data.stockValue)}</p>
        </div>
        <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Low Stock Items</p>
          <p className="text-2xl font-bold text-amber-600">{data.lowStock}</p>
        </div>
        <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Waste (30 days)</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.wasteCost)}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ListCard title="Fast Moving" items={data.fastMoving} />
        <ListCard title="Slow Moving" items={data.slowMoving} />
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="space-y-1 text-sm">
        {items.map((i) => (
          <li key={i} className="py-1 border-b last:border-0">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
