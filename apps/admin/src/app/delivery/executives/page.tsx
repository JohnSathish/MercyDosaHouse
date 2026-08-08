'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryExecutiveDetailDto } from '@mdh/types';
import { DeliveryExecutivesGrid } from '@/components/delivery/delivery-executives-grid';

export default function DeliveryExecutivesPage() {
  const queryClient = useQueryClient();

  const { data: executives = [], isLoading } = useQuery({
    queryKey: ['delivery-executives'],
    queryFn: () => api.get<DeliveryExecutiveDetailDto[]>('/delivery/executives'),
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/delivery/executives/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-executives'] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-[#14532D]" />
          Delivery Executives
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage riders, availability, and performance
        </p>
      </div>
      <DeliveryExecutivesGrid
        executives={executives}
        loading={isLoading}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
      />
    </div>
  );
}
