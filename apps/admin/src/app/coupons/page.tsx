'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@mdh/ui';
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Coupons</h1>
      <div className="space-y-3">
        {coupons?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex justify-between">
              <span className="font-mono font-bold">{c.code}</span>
              <span>{c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}</span>
              <span className="text-sm">{c.isActive ? 'Active' : 'Inactive'}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
