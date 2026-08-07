'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@mdh/ui';
import { api } from '@/lib/api';

export default function CategoriesPage() {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      api.get<{ id: string; name: string; slug: string; isActive: boolean }[]>('/categories'),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Categories</h1>
      <div className="space-y-3">
        {categories?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex justify-between">
              <span className="font-semibold">{c.name}</span>
              <span className="text-sm text-muted-foreground">
                {c.isActive ? 'Active' : 'Inactive'}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
