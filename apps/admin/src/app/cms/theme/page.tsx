'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { MediaUploader } from '@/components/cms/media-uploader';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { ThemeSettingsDto } from '@mdh/types';

export default function ThemeCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [draft, setDraft] = useState<ThemeSettingsDto | null>(null);

  const { data: theme, isLoading } = useQuery({
    queryKey: ['cms-theme'],
    queryFn: () => api.get<ThemeSettingsDto>('/cms/theme'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<ThemeSettingsDto>) => api.patch('/cms/theme', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-theme'] });
      setDraft(null);
      toast('Theme settings saved.');
    },
  });

  if (isLoading || !theme) return <p className="text-gray-500">Loading...</p>;

  const active = draft ?? theme;
  const update = (patch: Partial<ThemeSettingsDto>) => setDraft({ ...active, ...patch });

  return (
    <div>
      <CmsPageHeader
        title="Theme Settings"
        description="Customize colors, logo and brand appearance."
      />

      <Card className="max-w-xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Color</Label>
              <Input
                type="color"
                value={active.primaryColor}
                onChange={(e) => update({ primaryColor: e.target.value })}
              />
            </div>
            <div>
              <Label>Secondary Color</Label>
              <Input
                type="color"
                value={active.secondaryColor}
                onChange={(e) => update({ secondaryColor: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Font Family</Label>
            <Input
              value={active.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
            />
          </div>
          <div>
            <Label>Logo URL</Label>
            <div className="flex gap-2">
              <Input
                value={active.logoUrl ?? ''}
                onChange={(e) => update({ logoUrl: e.target.value })}
              />
              <MediaUploader onUploaded={(url) => update({ logoUrl: url })} />
            </div>
          </div>
          <Button className="bg-[#14532D]" onClick={() => saveMutation.mutate(active)}>
            Save Theme
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
