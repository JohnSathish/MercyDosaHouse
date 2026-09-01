'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Badge, cn } from '@mdh/ui';
import { api } from '@/lib/api';

type Row = {
  id: string;
  itemName: string;
  remainingQty: number;
  unit: string;
  expiryDate: string | null;
  daysLeft: number | null;
};

export default function ExpiryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-expiry-buckets'],
    queryFn: () =>
      api.get<{ expired: Row[]; today: Row[]; within3: Row[]; within7: Row[] }>(
        '/inventory/expiry-buckets',
      ),
  });

  const sections = [
    { key: 'expired', title: 'Expired', tone: 'red' },
    { key: 'today', title: 'Expiring Today', tone: 'orange' },
    { key: 'within3', title: 'Expiring Within 3 Days', tone: 'yellow' },
    { key: 'within7', title: 'Expiring Within 7 Days', tone: 'green' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-purple-500" />
        <div>
          <h1 className="text-2xl font-bold">Expiry Tracking</h1>
          <p className="text-muted-foreground text-sm">Batch dates from received stock only</p>
        </div>
      </div>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : (
        sections.map((s) => {
          const rows = data?.[s.key] ?? [];
          return (
            <div key={s.key} className="rounded-xl border bg-white p-4">
              <h2 className="font-semibold mb-3">{s.title}</h2>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((b) => (
                    <li key={b.id} className="flex justify-between text-sm border-b pb-2">
                      <div>
                        <p className="font-medium">{b.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.remainingQty} {b.unit}
                          {b.expiryDate
                            ? ` · ${new Date(b.expiryDate).toLocaleDateString('en-IN')}`
                            : ''}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          'text-[10px]',
                          s.tone === 'red' && 'bg-red-100 text-red-700',
                          s.tone === 'orange' && 'bg-orange-100 text-orange-700',
                          s.tone === 'yellow' && 'bg-yellow-100 text-yellow-800',
                          s.tone === 'green' && 'bg-emerald-100 text-emerald-700',
                        )}
                      >
                        {b.daysLeft != null && b.daysLeft <= 3
                          ? `Expires in ${b.daysLeft} days`
                          : s.title}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
