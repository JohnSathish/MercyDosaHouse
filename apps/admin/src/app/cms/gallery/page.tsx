'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Button, Input, Label, Card, CardContent } from '@mdh/ui';
import { Trash2, Star } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { MediaUploader } from '@/components/cms/media-uploader';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { GalleryItemDto } from '@mdh/types';

export default function GalleryCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['cms-gallery'],
    queryFn: () => api.get<GalleryItemDto[]>('/cms/gallery?all=true'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/cms/gallery', {
        title: newTitle || 'Gallery Image',
        imageUrl: newUrl,
        sortOrder: items.length,
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      setNewTitle('');
      setNewUrl('');
      toast('Image added to gallery.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/gallery/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      toast('Image removed.');
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      api.patch(`/cms/gallery/${id}`, { isFeatured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms-gallery'] }),
  });

  return (
    <div>
      <CmsPageHeader
        title="Gallery"
        description="Upload and manage food photos for the website gallery."
      />

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold">Add Image</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Masala Dosa"
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="/images/..."
              />
            </div>
            <div className="flex items-end gap-2">
              <MediaUploader onUploaded={setNewUrl} />
              <Button
                className="bg-[#14532D]"
                onClick={() => createMutation.mutate()}
                disabled={!newUrl || createMutation.isPending}
              >
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative aspect-square bg-gray-100">
              <Image
                src={item.imageUrl}
                alt={item.title ?? 'Gallery'}
                fill
                className="object-cover"
                sizes="200px"
              />
              {item.isFeatured && (
                <span className="absolute top-2 left-2 bg-[#F59E0B] text-xs font-bold px-2 py-0.5 rounded-full">
                  Featured
                </span>
              )}
            </div>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toggleFeatured.mutate({ id: item.id, isFeatured: !item.isFeatured })
                  }
                >
                  <Star
                    className={`w-4 h-4 ${item.isFeatured ? 'fill-[#F59E0B] text-[#F59E0B]' : ''}`}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => deleteMutation.mutate(item.id)}
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
