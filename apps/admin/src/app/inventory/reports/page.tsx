'use client';

import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download } from 'lucide-react';
import { Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { InventoryDashboardDto, InventoryItemDto } from '@mdh/types';

export default function InventoryReportsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => api.get<InventoryDashboardDto>('/inventory/dashboard'),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items-report'],
    queryFn: () => api.get<InventoryItemDto[]>('/inventory/items'),
  });

  const exportCsv = () => {
    const headers = ['SKU', 'Name', 'Category', 'Unit', 'Stock', 'Min', 'Cost', 'Value', 'Status'];
    const rows = items.map((i) =>
      [
        i.sku,
        i.name,
        i.categoryName,
        i.unit,
        i.currentStock,
        i.minStock,
        i.costPrice,
        i.stockValue,
        i.status,
      ].join(','),
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory-report.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-[#14532D]" /> Inventory Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stock ledger, consumption, and cost analysis
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {dashboard && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Total Stock Value', value: formatCurrency(dashboard.stats.stockValue) },
            { label: 'Items Tracked', value: dashboard.stats.totalItems },
            {
              label: 'Low + Out of Stock',
              value: dashboard.stats.lowStock + dashboard.stats.outOfStock,
            },
            { label: 'Purchase Today', value: formatCurrency(dashboard.stats.purchaseToday) },
            { label: 'Consumption Today', value: formatCurrency(dashboard.stats.consumptionToday) },
            { label: 'Expiring Soon', value: dashboard.stats.expiringSoon },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="font-semibold mb-3">Top Consumed Ingredients (30 days)</h3>
        {!dashboard?.topConsumed?.length ? (
          <p className="text-muted-foreground text-sm">
            No consumption data yet — prepare orders in KDS to auto-deduct.
          </p>
        ) : (
          <ul className="space-y-2">
            {dashboard.topConsumed.map((t, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span>
                  {i + 1}. {t.name}
                </span>
                <span className="font-semibold">{t.quantity.toFixed(2)} units</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
