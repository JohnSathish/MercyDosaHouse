'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';

const STATUS_FLOW = ['DRAFT', 'SENT', 'APPROVED', 'RECEIVED', 'CLOSED'];

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get<Array<Record<string, unknown>>>('/inventory/purchase-orders'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/inventory/purchase-orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast('PO status updated');
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Purchase Orders</h1>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground">
          No purchase orders yet. Create one from the admin panel.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((po) => {
            const supplier = po.supplier as { name: string };
            const items = po.items as Array<{
              item: { name: string };
              quantity: number;
              rate: number;
            }>;
            const statusIdx = STATUS_FLOW.indexOf(String(po.status));
            const nextStatus = STATUS_FLOW[statusIdx + 1];

            return (
              <div
                key={String(po.id)}
                className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm"
              >
                <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="font-mono font-bold text-lg">{String(po.poNumber)}</p>
                    <p className="text-sm text-muted-foreground">{supplier?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(Number(po.total))}</p>
                    <Badge className="mt-1">{String(po.status)}</Badge>
                  </div>
                </div>
                <ul className="text-sm space-y-1 mb-3">
                  {items?.map((i, idx) => (
                    <li key={idx} className="flex justify-between text-muted-foreground">
                      <span>
                        {i.item?.name} × {Number(i.quantity)}
                      </span>
                      <span>{formatCurrency(Number(i.rate))}/unit</span>
                    </li>
                  ))}
                </ul>
                {nextStatus && (
                  <Button
                    size="sm"
                    className="bg-[#14532D]"
                    onClick={() => updateStatus.mutate({ id: String(po.id), status: nextStatus })}
                  >
                    Mark as {nextStatus}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
