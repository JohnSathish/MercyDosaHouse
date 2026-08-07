'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Select } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { ProductDto } from '@mdh/types';
import { useState } from 'react';

export default function MenuManagementPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    price: '',
    categoryId: '',
    description: '',
  });

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get<{ data: ProductDto[] }>('/products'),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/categories'),
  });

  const createProduct = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/products', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setShowForm(false);
      setForm({ name: '', slug: '', price: '', categoryId: '', description: '' });
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/products/${id}`, { isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button
              onClick={() =>
                createProduct.mutate({
                  ...form,
                  price: parseFloat(form.price),
                  foodType: 'VEG',
                  spiceLevel: 'MILD',
                  prepTimeMinutes: 15,
                })
              }
            >
              Save Product
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {products?.data.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(p.price)} — {p.category?.name}
                </p>
              </div>
              <Button
                size="sm"
                variant={p.isAvailable ? 'outline' : 'secondary'}
                onClick={() => toggleAvailability.mutate({ id: p.id, isAvailable: !p.isAvailable })}
              >
                {p.isAvailable ? 'Available' : 'Unavailable'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
