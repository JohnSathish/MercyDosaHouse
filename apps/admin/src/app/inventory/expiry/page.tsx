'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Badge, cn } from '@mdh/ui';
import { api } from '@/lib/api';

const URGENCY_COLORS: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
};

export default function ExpiryPage() {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['inventory-expiring'],
    queryFn: () => api.get<Array<Record<string, unknown>>>('/inventory/expiring?days=14'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-purple-500" />
        <div>
          <h1 className="text-2xl font-bold">Expiry Tracking</h1>
          <p className="text-muted-foreground text-sm">Batches expiring within 14 days</p>
        </div>
      </div>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : batches.length === 0 ? (
        <p className="text-muted-foreground">No batches expiring soon.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Days Left</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={String(b.id)} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{String(b.itemName)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(b.batchNumber)}</td>
                  <td className="px-4 py-3">
                    {Number(b.remainingQty)} {String(b.unit)}
                  </td>
                  <td className="px-4 py-3">
                    {b.expiryDate
                      ? new Date(String(b.expiryDate)).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold">{b.daysLeft ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-[10px]', URGENCY_COLORS[String(b.urgency)] ?? '')}>
                      {String(b.urgency).toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
