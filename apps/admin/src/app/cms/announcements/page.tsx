'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, Badge } from '@mdh/ui';
import { Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { AnnouncementDto } from '@mdh/types';

export default function AnnouncementsCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [form, setForm] = useState<Partial<AnnouncementDto> | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['cms-announcements'],
    queryFn: () => api.get<AnnouncementDto[]>('/cms/announcements?all=true'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AnnouncementDto>) =>
      data.id
        ? api.patch(`/cms/announcements/${data.id}`, data)
        : api.post('/cms/announcements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-announcements'] });
      setForm(null);
      toast('Announcement saved.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cms-announcements'] }),
  });

  return (
    <div>
      <CmsPageHeader
        title="Announcements & Popups"
        description="Manage top announcement bars and promotional popups."
        action={{
          label: '+ New Announcement',
          onClick: () => setForm({ title: '', message: '', type: 'BAR', isActive: true }),
        }}
      />

      {form && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title ?? ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={form.type ?? 'BAR'}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'BAR' | 'POPUP' })}
                >
                  <option value="BAR">Announcement Bar</option>
                  <option value="POPUP">Popup</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Message</Label>
                <Input
                  value={form.message ?? ''}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <div>
                <Label>Link URL (optional)</Label>
                <Input
                  value={form.linkUrl ?? ''}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
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
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{item.title}</p>
                  <Badge variant={item.isActive ? 'default' : 'outline'}>{item.type}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.message}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setForm(item)}>
                  Edit
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
