'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type { InventoryItemDto } from '@mdh/types';
import { IngredientsTable, IngredientsMobileCards } from '@/components/inventory/ingredients-table';
import { IngredientFormDialog } from '@/components/inventory/ingredient-form-dialog';
import { IngredientDetailDrawer } from '@/components/inventory/ingredient-detail-drawer';
import { useToastStore } from '@/lib/toast-store';
import { useRouter } from 'next/navigation';

export default function IngredientsPage() {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryItemDto | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items', search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get<InventoryItemDto[]>(`/inventory/items${qs}`);
    },
  });

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const deactivate = useMutation({
    mutationFn: (id: string) => api.post(`/inventory/items/${id}/deactivate`),
    onSuccess: () => {
      toast('Ingredient deactivated');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setSelectedId(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} raw materials tracked · stock changes always create a ledger entry
          </p>
        </div>
        <Button
          className="bg-[#14532D] gap-1.5 min-h-[44px]"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add Ingredient
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search ingredient / SKU / barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30"
        />
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <p className="font-semibold text-[#14532D]">No ingredients added yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start by adding your first ingredient.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <IngredientsTable items={items} onSelect={setSelectedId} />
          </div>
          <IngredientsMobileCards items={items} onSelect={setSelectedId} />
        </>
      )}

      <IngredientFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <IngredientDetailDrawer
        itemId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={() => {
          if (selected) {
            setEditing(selected);
            setFormOpen(true);
          }
        }}
        onAdjust={() => router.push('/inventory/adjustments')}
        onPurchase={() =>
          router.push(
            selectedId
              ? `/inventory/purchase-orders?itemId=${selectedId}`
              : '/inventory/purchase-orders',
          )
        }
        onDeactivate={() => selectedId && deactivate.mutate(selectedId)}
      />
    </div>
  );
}
