'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardContent } from '@mdh/ui';
import { api } from '@/lib/api';

export default function CouponsPage() {
  const { data: coupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: () =>
      api.get<{ id: string; code: string; type: string; value: number; isActive: boolean }[]>(
        '/coupons',
      ),
  });

  return (
    <div className="w-full min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Coupons</h1>
      <div className="space-y-3">
        {coupons?.length === 0 && (
          <p className="text-center py-12 text-muted-foreground text-sm">No coupons yet</p>
        )}
        {coupons?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="font-mono font-bold text-[#14532D] break-all">{c.code}</span>
              <span className="text-lg font-semibold">
                {c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}
              </span>
              <Badge
                variant={c.isActive ? 'default' : 'outline'}
                className="self-start sm:self-auto"
              >
                {c.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
