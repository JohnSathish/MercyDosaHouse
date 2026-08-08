'use client';

import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { api } from '@/lib/api';
import type { InventoryDashboardDto } from '@mdh/types';
import { InventoryDashboardView } from '@/components/inventory/inventory-dashboard';

export default function InventoryDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => api.get<InventoryDashboardDto>('/inventory/dashboard'),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-[#14532D]" />
          Inventory Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time stock levels, consumption, and alerts
        </p>
      </div>
      <InventoryDashboardView data={data} loading={isLoading} />
    </div>
  );
}
