'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type { InventoryItemDto } from '@mdh/types';
import { StockAdjustmentReason } from '@mdh/types';
import { useToastStore } from '@/lib/toast-store';

export default function AdjustmentsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockAdjustmentReason>(StockAdjustmentReason.ADD);
  const [notes, setNotes] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get<InventoryItemDto[]>('/inventory/items'),
  });

  const adjust = useMutation({
    mutationFn: () =>
      api.post(`/inventory/items/${selectedId}/adjust`, {
        quantity: parseFloat(quantity),
        reason,
        notes,
      }),
    onSuccess: () => {
      toast('Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      setQuantity('');
      setNotes('');
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Adjustment failed'),
  });

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">Stock Adjustment</h1>
      <p className="text-muted-foreground text-sm">
        Add, remove, or correct stock levels. Every change is logged.
      </p>

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-6 space-y-4 shadow-sm">
        <div>
          <label className="text-sm font-medium">Ingredient</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full mt-1 h-10 rounded-lg border px-3 text-sm"
          >
            <option value="">Select ingredient…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.currentStock} {i.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full mt-1 h-10 rounded-lg border px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
            className="w-full mt-1 h-10 rounded-lg border px-3 text-sm"
          >
            {Object.values(StockAdjustmentReason).map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full mt-1 rounded-lg border px-3 py-2 text-sm min-h-[80px]"
          />
        </div>
        <Button
          className="w-full bg-[#14532D]"
          disabled={!selectedId || !quantity || adjust.isPending}
          onClick={() => adjust.mutate()}
        >
          {adjust.isPending ? 'Adjusting…' : 'Apply Adjustment'}
        </Button>
      </div>
    </div>
  );
}
