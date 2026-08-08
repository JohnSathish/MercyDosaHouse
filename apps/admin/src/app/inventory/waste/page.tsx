'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { InventoryItemDto } from '@mdh/types';
import { WasteReason } from '@mdh/types';
import { useToastStore } from '@/lib/toast-store';

export default function WastePage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<WasteReason>(WasteReason.KITCHEN_WASTE);
  const [notes, setNotes] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get<InventoryItemDto[]>('/inventory/items'),
  });

  const { data: report } = useQuery({
    queryKey: ['inventory-waste'],
    queryFn: () =>
      api.get<{ wastes: Array<Record<string, unknown>>; totalLoss: number }>(
        '/inventory/waste?days=30',
      ),
  });

  const recordWaste = useMutation({
    mutationFn: () =>
      api.post(`/inventory/items/${selectedId}/waste`, {
        quantity: parseFloat(quantity),
        reason,
        notes,
      }),
    onSuccess: () => {
      toast('Waste recorded');
      queryClient.invalidateQueries({ queryKey: ['inventory-waste'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setQuantity('');
      setNotes('');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-red-500" /> Waste Management
        </h1>
        {report && (
          <p className="text-muted-foreground text-sm mt-1">
            30-day waste cost:{' '}
            <span className="font-bold text-red-600">{formatCurrency(report.totalLoss)}</span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-6 space-y-4 shadow-sm">
          <h3 className="font-semibold">Record Waste</h3>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full h-10 rounded-lg border px-3 text-sm"
          >
            <option value="">Select ingredient…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full h-10 rounded-lg border px-3 text-sm"
          />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as WasteReason)}
            className="w-full h-10 rounded-lg border px-3 text-sm"
          >
            {Object.values(WasteReason).map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[60px]"
          />
          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            disabled={!selectedId || !quantity}
            onClick={() => recordWaste.mutate()}
          >
            Record Waste
          </Button>
        </div>

        <div className="rounded-xl border bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h3 className="font-semibold mb-3">Recent Waste (30 days)</h3>
          {!report?.wastes?.length ? (
            <p className="text-muted-foreground text-sm">No waste recorded</p>
          ) : (
            <ul className="space-y-2">
              {report.wastes.slice(0, 10).map((w) => {
                const item = w.item as { name: string };
                return (
                  <li key={String(w.id)} className="flex justify-between text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{item?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(w.reason).replace('_', ' ')}
                      </p>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatCurrency(Number(w.costLoss))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
