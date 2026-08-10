'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () => api.get<Array<Record<string, unknown>>>('/inventory/suppliers'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Suppliers</h1>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={String(s.id)}
              className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{String(s.name)}</h3>
                <Badge variant="outline">
                  {String((s._count as { items: number })?.items ?? 0)} items
                </Badge>
              </div>
              {s.contactPerson ? <p className="text-sm">{String(s.contactPerson)}</p> : null}
              {s.phone ? <p className="text-sm text-muted-foreground">{String(s.phone)}</p> : null}
              {s.email ? <p className="text-sm text-muted-foreground">{String(s.email)}</p> : null}
              {s.gstNumber ? (
                <p className="text-xs text-muted-foreground mt-1">GST: {String(s.gstNumber)}</p>
              ) : null}
              {s.paymentTerms ? (
                <p className="text-xs mt-2">Terms: {String(s.paymentTerms)}</p>
              ) : null}
              <p className="text-sm font-semibold mt-2 text-[#14532D]">
                Outstanding: {formatCurrency(Number(s.outstandingBalance ?? 0))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
