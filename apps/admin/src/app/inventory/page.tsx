'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { api } from '@/lib/api';
import type { InventoryDashboardDto, BusinessSettingsDto } from '@mdh/types';
import { InventoryDashboardView } from '@/components/inventory/inventory-dashboard';

export default function InventoryDashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => api.get<InventoryDashboardDto>('/inventory/dashboard'),
    refetchInterval: 60_000,
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });
  const toggle = useMutation({
    mutationFn: (autoMenuAvailability: boolean) =>
      api.patch('/settings/business', { autoMenuAvailability }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-[#14532D]" />
            Inventory Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ingredients, purchases, receiving, consumption, and alerts from live stock
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm border rounded-xl px-3 py-2 bg-white">
          <input
            type="checkbox"
            checked={Boolean(settings?.autoMenuAvailability)}
            onChange={(e) => toggle.mutate(e.target.checked)}
          />
          Automatic Menu Availability Control
        </label>
      </div>
      <InventoryDashboardView data={data} loading={isLoading} />
    </div>
  );
}
