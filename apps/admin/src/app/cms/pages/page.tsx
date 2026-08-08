'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Textarea, Card, CardContent, Badge } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { CmsPageDto } from '@mdh/types';

export default function PagesCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [selected, setSelected] = useState<CmsPageDto | null>(null);

  const { data: pages = [] } = useQuery({
    queryKey: ['cms-pages'],
    queryFn: () => api.get<CmsPageDto[]>('/cms/pages'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<CmsPageDto>) =>
      data.id ? api.patch(`/cms/pages/${data.id}`, data) : api.post('/cms/pages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
      toast('Page saved.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/cms/pages/${id}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
      toast('Page published!');
    },
  });

  return (
    <div>
      <CmsPageHeader
        title="Pages"
        description="Edit About, policies and custom content pages."
        action={{
          label: '+ New Page',
          onClick: () =>
            setSelected({
              id: '',
              slug: '',
              title: '',
              content: '',
              status: 'DRAFT',
            } as CmsPageDto),
        }}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelected(page)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selected?.id === page.id
                  ? 'border-[#14532D] bg-[#14532D]/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="font-semibold">{page.title}</p>
              <p className="text-xs text-gray-400">/{page.slug}</p>
              <Badge className="mt-1" variant={page.status === 'PUBLISHED' ? 'default' : 'outline'}>
                {page.status}
              </Badge>
            </button>
          ))}
        </div>

        {selected && (
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={selected.title}
                    onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={selected.slug}
                    onChange={(e) => setSelected({ ...selected, slug: e.target.value })}
                    disabled={!!selected.id}
                  />
                </div>
              </div>
              <div>
                <Label>Content (HTML)</Label>
                <Textarea
                  rows={12}
                  value={selected.content ?? ''}
                  onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="bg-[#14532D]"
                  onClick={() => saveMutation.mutate(selected)}
                  disabled={saveMutation.isPending}
                >
                  Save
                </Button>
                {selected.id && (
                  <Button variant="outline" onClick={() => publishMutation.mutate(selected.id)}>
                    Publish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
