'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@mdh/utils';
import { Badge, Button } from '@mdh/ui';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ItemDetail = {
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  averageCost: number;
  costPrice: number;
  stockValue: number;
  unit: string;
  supplierName?: string | null;
  locationName?: string | null;
  movements: Array<{
    id: string;
    type: string;
    quantity: number;
    afterQty: number;
    reason: string | null;
    reference: string | null;
    createdAt: string;
  }>;
};

export function IngredientDetailDrawer({
  itemId,
  onClose,
  onEdit,
  onAdjust,
  onPurchase,
  onDeactivate,
}: {
  itemId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onAdjust: () => void;
  onPurchase: () => void;
  onDeactivate: () => void;
}) {
  const [type, setType] = useState('');
  const { data } = useQuery({
    queryKey: ['inventory-item', itemId],
    queryFn: () => api.get<ItemDetail>(`/inventory/items/${itemId}`),
    enabled: Boolean(itemId),
  });

  const movements = useMemo(() => {
    if (!data?.movements) return [];
    return type ? data.movements.filter((m) => m.type === type) : data.movements;
  }, [data, type]);

  return (
    <Dialog open={Boolean(itemId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data?.name ?? 'Ingredient'}</DialogTitle>
        </DialogHeader>
        {!data ? (
          <div className="h-40 bg-muted animate-pulse rounded-xl" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Current Stock" value={`${data.currentStock} ${data.unit}`} />
              <Stat label="Minimum Stock" value={`${data.minStock} ${data.unit}`} />
              <Stat
                label="Average Cost"
                value={`${formatCurrency(data.averageCost)} / ${data.unit}`}
              />
              <Stat label="Current Stock Value" value={formatCurrency(data.stockValue)} />
              <Stat label="Preferred Supplier" value={data.supplierName ?? '—'} />
              <Stat label="Location" value={data.locationName ?? '—'} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onEdit}>
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={onAdjust}>
                Adjust Stock
              </Button>
              <Button size="sm" className="bg-[#14532D]" onClick={onPurchase}>
                Purchase
              </Button>
              <Button size="sm" variant="outline" onClick={onDeactivate}>
                Deactivate
              </Button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Stock Movement History</h3>
                <select
                  className="h-9 rounded-lg border px-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">All types</option>
                  {[...new Set(data.movements.map((m) => m.type))].map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Balance</th>
                      <th className="px-3 py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                          No stock movements yet
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="border-b">
                          <td className="px-3 py-2">
                            {new Date(m.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline">{m.type.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            {m.type.includes('OUT') ||
                            m.type === 'WASTE' ||
                            m.type === 'RECIPE_USAGE' ||
                            m.type === 'CONSUMPTION'
                              ? '−'
                              : '+'}
                            {m.quantity} {data.unit}
                          </td>
                          <td className="px-3 py-2">
                            {m.afterQty} {data.unit}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.reference ?? m.reason ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3 bg-[#F8F4E8]/60">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-bold text-[#14532D] mt-1">{value}</p>
    </div>
  );
}
