'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, Badge } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { CmsSectionDto, HeroSectionContent } from '@mdh/types';

export default function HomepageCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['cms-sections', 'home'],
    queryFn: () => api.get<CmsSectionDto[]>('/cms/sections?pageKey=home'),
  });

  const hero = sections.find((s) => s.sectionKey === 'hero');
  const heroContent = (hero?.content ?? {}) as HeroSectionContent;

  const [form, setForm] = useState<HeroSectionContent | null>(null);
  const activeForm = form ?? heroContent;

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/cms/sections', {
        pageKey: 'home',
        sectionKey: 'hero',
        title: 'Hero Section',
        content: activeForm,
        sortOrder: 1,
        isEnabled: true,
        status: 'DRAFT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-sections'] });
      toast('Hero section saved as draft.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const saved = await api.put<CmsSectionDto>('/cms/sections', {
        pageKey: 'home',
        sectionKey: 'hero',
        title: 'Hero Section',
        content: activeForm,
        sortOrder: 1,
        isEnabled: true,
      });
      return api.post(`/cms/sections/${saved.id}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-sections'] });
      toast('Hero section published! Live on website.');
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  const update = (patch: Partial<HeroSectionContent>) =>
    setForm((prev) => ({ ...(prev ?? heroContent), ...patch }));

  return (
    <div>
      <CmsPageHeader
        title="Home Page Builder"
        description="Edit hero section, tagline, CTAs and statistics."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#14532D]">Hero Section</h2>
              <Badge variant={hero?.status === 'PUBLISHED' ? 'default' : 'outline'}>
                {hero?.status ?? 'DRAFT'}
              </Badge>
            </div>

            <div>
              <Label>Badge Text</Label>
              <Input
                value={activeForm.badge ?? ''}
                onChange={(e) => update({ badge: e.target.value })}
              />
            </div>
            <div>
              <Label>Restaurant Name</Label>
              <Input
                value={activeForm.title ?? ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={activeForm.subtitle ?? ''}
                onChange={(e) => update({ subtitle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Button</Label>
                <Input
                  value={activeForm.ctaPrimary?.label ?? ''}
                  onChange={(e) =>
                    update({
                      ctaPrimary: {
                        label: e.target.value,
                        href: activeForm.ctaPrimary?.href ?? '/menu',
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Primary Link</Label>
                <Input
                  value={activeForm.ctaPrimary?.href ?? ''}
                  onChange={(e) =>
                    update({
                      ctaPrimary: {
                        label: activeForm.ctaPrimary?.label ?? 'Order Now',
                        href: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                Save Draft
              </Button>
              <Button
                className="bg-[#14532D]"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#FFF8E8]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-[#F59E0B] uppercase mb-3">Live Preview</p>
            <div className="rounded-2xl bg-[#14532D] text-white p-6 min-h-[280px]">
              <p className="text-[#F59E0B] text-sm font-semibold">{activeForm.badge}</p>
              <h3 className="text-2xl font-bold mt-2">{activeForm.title}</h3>
              <p className="text-white/80 text-sm mt-2">{activeForm.subtitle}</p>
              <div className="flex gap-3 mt-6">
                <span className="px-4 py-2 bg-[#F59E0B] text-[#1F2937] rounded-xl text-sm font-bold">
                  {activeForm.ctaPrimary?.label ?? 'Order Now'}
                </span>
                <span className="px-4 py-2 border border-white/40 rounded-xl text-sm">
                  {activeForm.ctaSecondary?.label ?? 'View Menu'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
