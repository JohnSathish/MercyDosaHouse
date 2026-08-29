'use client';

import { useRef } from 'react';
import { Button } from '@mdh/ui';
import { Upload } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { getAccessToken } from '@mdh/auth-client';

interface MediaUploaderProps {
  onUploaded: (url: string) => void;
  label?: string;
  accept?: string;
}

export function MediaUploader({
  onUploaded,
  label = 'Upload Image',
  accept = 'image/*',
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) return;
    const data = (await res.json()) as { url: string };
    onUploaded(data.url);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-4 h-4" />
        {label}
      </Button>
    </>
  );
}
