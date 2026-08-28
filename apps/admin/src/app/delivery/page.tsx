'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto } from '@mdh/types';
import { DeliveryCommandCenter } from '@/components/delivery/delivery-command-center';

export default function DeliveryDashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
    refetchInterval: 30_000,
  });

  return (
    <DeliveryCommandCenter
      data={data}
      loading={isLoading}
      refreshing={isFetching}
      onRefresh={() => void refetch()}
    />
  );
}
