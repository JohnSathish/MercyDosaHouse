'use client';

import { useQuery } from '@tanstack/react-query';
import { Monitor } from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';

export default function PosReportsPage() {
  const { data } = useQuery({
    queryKey: ['reports-pos'],
    queryFn: () =>
      api.get<{
        totalSales: number;
        orderCount: number;
        totalDiscount: number;
        avgBill: number;
      }>('/reports/pos?period=today'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6 text-[#14532D]" />
          POS Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Daily sales, cashier, and table analytics
        </p>
      </div>
      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Sales', value: formatCurrency(data.totalSales) },
            { label: 'Orders', value: String(data.orderCount) },
            { label: 'Avg Bill', value: formatCurrency(data.avgBill) },
            { label: 'Discounts', value: formatCurrency(data.totalDiscount) },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">{c.label}</p>
              <p className="text-2xl font-bold text-[#14532D] mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
