'use client';

import { useQuery } from '@tanstack/react-query';
import { UtensilsCrossed } from 'lucide-react';
import { api } from '@/lib/api';
import type { ProductPerformanceDto } from '@mdh/types';
import { ProductPerformanceTable } from '@/components/reports/product-performance-table';

export default function ProductReportsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['reports-products-full'],
    queryFn: () => api.get<ProductPerformanceDto[]>('/reports/products?limit=50'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-[#14532D]" />
          Product Performance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Menu item sales, profit, and popularity analysis
        </p>
      </div>
      <ProductPerformanceTable products={products} loading={isLoading} />
    </div>
  );
}
