'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Button, Input, Card, CardContent } from '@mdh/ui';
import { Trash2, Upload } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { API_URL, api } from '@/lib/api';
import { getAccessToken } from '@mdh/auth-client';
import { useToastStore } from '@/lib/toast-store';
import type { MediaAssetDto, PaginatedResult } from '@mdh/types';

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['media-library', search],
    queryFn: () =>
      api.get<PaginatedResult<MediaAssetDto>>(
        `/media?search=${encodeURIComponent(search)}&limit=50`,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      toast('File deleted.');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const token = getAccessToken();
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['media-library'] });
    toast('Upload complete.');
    if (inputRef.current) inputRef.current.value = '';
  };

  const assets = data?.data ?? [];

  return (
    <div>
      <CmsPageHeader
        title="Media Library"
        description="Upload, browse and manage all website images."
        action={{
          label: 'Upload Files',
          onClick: () => inputRef.current?.click(),
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <Input
        placeholder="Search media..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm mb-6"
      />

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group">
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={asset.url}
                  alt={asset.altText ?? asset.filename}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate font-medium">{asset.filename}</p>
                <p className="text-[10px] text-gray-400">{(asset.size / 1024).toFixed(0)} KB</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1 text-red-600 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteMutation.mutate(asset.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && assets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Upload className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No media files yet. Upload your first image.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
