'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent } from '@mdh/ui';
import { Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { TestimonialDto } from '@mdh/types';

export default function TestimonialsCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [form, setForm] = useState<Partial<TestimonialDto> | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['cms-testimonials'],
    queryFn: () => api.get<TestimonialDto[]>('/cms/testimonials?all=true'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<TestimonialDto>) =>
      data.id
        ? api.patch(`/cms/testimonials/${data.id}`, data)
        : api.post('/cms/testimonials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-testimonials'] });
      setForm(null);
      toast('Testimonial saved.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/testimonials/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms-testimonials'] }),
  });

  return (
    <div>
      <CmsPageHeader
        title="Testimonials"
        description="Manage customer reviews shown on the homepage."
        action={{
          label: '+ Add Review',
          onClick: () => setForm({ customerName: '', comment: '', rating: 5 }),
        }}
      />

      {form && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={form.customerName ?? ''}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label>Rating (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating ?? 5}
                  onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Comment</Label>
                <Input
                  value={form.comment ?? ''}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="bg-[#14532D]" onClick={() => saveMutation.mutate(form)}>
                Save
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 flex justify-between gap-4">
              <div>
                <p className="font-bold">
                  {t.customerName} · {'★'.repeat(t.rating)}
                </p>
                <p className="text-sm text-gray-600 mt-1">&ldquo;{t.comment}&rdquo;</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setForm(t)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => deleteMutation.mutate(t.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
