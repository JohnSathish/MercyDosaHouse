'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { InventoryItemDto } from '@mdh/types';
import { IngredientsTable, IngredientsMobileCards } from '@/components/inventory/ingredients-table';

export default function IngredientsPage() {
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items', search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get<InventoryItemDto[]>(`/inventory/items${qs}`);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ingredients</h1>
        <p className="text-muted-foreground text-sm">{items.length} raw materials tracked</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name, SKU, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30"
        />
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      ) : (
        <>
          <div className="hidden md:block">
            <IngredientsTable items={items} />
          </div>
          <IngredientsMobileCards items={items} />
        </>
      )}
    </div>
  );
}
