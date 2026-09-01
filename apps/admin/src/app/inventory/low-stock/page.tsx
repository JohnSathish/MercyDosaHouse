'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Badge, Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type { InventoryItemDto } from '@mdh/types';

export default function LowStockPage() {
  const router = useRouter();
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
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-red-600">
                  Current: {item.currentStock} {item.unit} · Minimum: {item.minStock} {item.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-700">LOW STOCK</Badge>
                <Button
                  size="sm"
                  className="bg-[#14532D]"
                  onClick={() => router.push(`/inventory/purchase-orders?itemId=${item.id}`)}
                >
                  Create Purchase Order
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
