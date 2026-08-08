'use client';

import { useQuery } from '@tanstack/react-query';
import { ChefHat } from 'lucide-react';
import { api } from '@/lib/api';

export default function RecipesPage() {
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['inventory-recipes'],
    queryFn: () => api.get<Array<Record<string, unknown>>>('/inventory/recipes'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-[#14532D]" /> Recipe Management
        </h1>
        <p className="text-muted-foreground text-sm">
          Menu items linked to ingredient consumption — auto-deducts on order preparation
        </p>
      </div>

      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : recipes.length === 0 ? (
        <p className="text-muted-foreground">No recipes configured yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {recipes.map((r) => {
            const product = r.product as { name: string };
            const items = r.items as Array<{
              quantity: number;
              unit: string;
              item: { name: string };
            }>;
            return (
              <div
                key={String(r.id)}
                className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm"
              >
                <h3 className="font-bold text-lg mb-1">{String(r.name)}</h3>
                <p className="text-sm text-muted-foreground mb-3">Menu: {product?.name}</p>
                <ul className="space-y-1.5">
                  {items?.map((ri, i) => (
                    <li key={i} className="flex justify-between text-sm border-b pb-1.5">
                      <span>{ri.item?.name}</span>
                      <span className="font-semibold text-[#14532D]">
                        {Number(ri.quantity)} {ri.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
