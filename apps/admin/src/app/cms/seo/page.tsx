'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { SeoMetadataDto } from '@mdh/types';

const PAGE_KEYS = ['home', 'menu', 'about', 'contact', 'gallery'];

export default function SeoCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [pageKey, setPageKey] = useState('home');

  const { data: entries = [] } = useQuery({
    queryKey: ['cms-seo'],
    queryFn: () => api.get<SeoMetadataDto[]>('/cms/seo'),
  });

  const current = entries.find((e) => e.pageKey === pageKey);
  const [form, setForm] = useState<Partial<SeoMetadataDto>>({});

  const active = { pageKey, ...current, ...form };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/cms/seo/${pageKey}`, {
        metaTitle: active.metaTitle,
        metaDescription: active.metaDescription,
        keywords: active.keywords,
        ogImage: active.ogImage,
        canonicalUrl: active.canonicalUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-seo'] });
      setForm({});
      toast('SEO settings saved.');
    },
  });

  return (
    <div>
      <CmsPageHeader
        title="SEO Manager"
        description="Manage meta titles, descriptions and OG images per page."
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {PAGE_KEYS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={pageKey === key ? 'default' : 'outline'}
            className={pageKey === key ? 'bg-[#14532D]' : ''}
            onClick={() => {
              setPageKey(key);
              setForm({});
            }}
          >
            {key}
          </Button>
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Meta Title</Label>
            <Input
              value={active.metaTitle ?? ''}
              onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
            />
          </div>
          <div>
            <Label>Meta Description</Label>
            <Input
              value={active.metaDescription ?? ''}
              onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
            />
          </div>
          <div>
            <Label>Keywords</Label>
            <Input
              value={active.keywords ?? ''}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </div>
          <div>
            <Label>OG Image URL</Label>
            <Input
              value={active.ogImage ?? ''}
              onChange={(e) => setForm({ ...form, ogImage: e.target.value })}
            />
          </div>
          <Button className="bg-[#14532D]" onClick={() => saveMutation.mutate()}>
            Save SEO for {pageKey}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
