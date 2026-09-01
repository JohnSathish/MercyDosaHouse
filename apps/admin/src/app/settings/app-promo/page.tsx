'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { AppPromoConfigDto } from '@mdh/types';
import Link from 'next/link';

export default function AppPromoSettingsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { data } = useQuery({
    queryKey: ['settings-app-promo'],
    queryFn: () => api.get<AppPromoConfigDto>('/settings/app-promo'),
  });
  const [form, setForm] = useState<AppPromoConfigDto | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: AppPromoConfigDto) =>
      api.patch<AppPromoConfigDto>('/settings/app-promo', body),
    onSuccess: (next) => {
      qc.setQueryData(['settings-app-promo'], next);
      toast('App promotion saved.');
    },
    onError: (e: Error) => toast(e.message),
  });

  if (!form) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">App promotion</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Website banners and popups that send customers to the Play Store. App-only discounts are
          created under{' '}
          <Link href="/offers-discounts" className="font-semibold text-[#14532D] underline">
            Offers & Discounts
          </Link>
          .
        </p>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enable app promotion
          </label>
          <div>
            <Label>Title</Label>
            <Input
              className="mt-1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Message</Label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-20"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div>
            <Label>Button label</Label>
            <Input
              className="mt-1"
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
            />
          </div>
          <div>
            <Label>Play Store URL</Label>
            <Input
              className="mt-1"
              placeholder="https://play.google.com/store/apps/details?id=com.mercydosahouse.customer"
              value={form.playStoreUrl}
              onChange={(e) => setForm({ ...form, playStoreUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Defaults to the live customer listing if left empty.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showOnWebsite}
              onChange={(e) => setForm({ ...form, showOnWebsite: e.target.checked })}
            />
            Show on website header
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showOnMenu}
              onChange={(e) => setForm({ ...form, showOnMenu: e.target.checked })}
            />
            Show on menu
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showOnCheckout}
              onChange={(e) => setForm({ ...form, showOnCheckout: e.target.checked })}
            />
            Show on website checkout
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showAsPopup}
              onChange={(e) => setForm({ ...form, showAsPopup: e.target.checked })}
            />
            Show as popup
          </label>
          <Button
            className="bg-[#14532D]"
            disabled={save.isPending}
            onClick={() => save.mutate(form)}
          >
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
