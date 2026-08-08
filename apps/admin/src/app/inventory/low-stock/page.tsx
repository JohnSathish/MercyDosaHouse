'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@mdh/ui';
import { api } from '@/lib/api';
import type { InventoryItemDto } from '@mdh/types';
import { IngredientsTable } from '@/components/inventory/ingredients-table';

export default function LowStockPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => api.get<InventoryItemDto[]>('/inventory/items?lowStock=true'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
          <p className="text-muted-foreground text-sm">{items.length} items need attention</p>
        </div>
      </div>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
          <p className="text-emerald-700 font-semibold">All stock levels are healthy</p>
        </div>
      ) : (
        <IngredientsTable items={items} />
      )}
    </div>
  );
}
