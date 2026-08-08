'use client';

import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto } from '@mdh/types';
import { DeliveryDashboardView } from '@/components/delivery/delivery-dashboard';

export default function DeliveryDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-[#14532D]" />
          Delivery Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time delivery operations, rider tracking, and performance metrics
        </p>
      </div>
      <DeliveryDashboardView data={data} loading={isLoading} />
    </div>
  );
}
