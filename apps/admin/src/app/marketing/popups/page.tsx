'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardContent, Input, Label, Textarea } from '@mdh/ui';
import type {
  MarketingAnnouncementDto,
  PopupCtaType,
  PopupContentType,
  PopupFrequency,
} from '@mdh/types';
import { Copy, Eye, ImagePlus, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { API_URL, api } from '@/lib/api';
import { getAccessToken } from '@mdh/auth-client';
import { useToastStore } from '@/lib/toast-store';

type LifecycleFilter = 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED';

const popupTypes: PopupContentType[] = [
  'PROMOTIONAL_POSTER',
  'OFFER',
  'ANNOUNCEMENT',
  'NEW_ITEM',
  'FESTIVAL_SPECIAL',
  'PRE_ORDER',
  'CUSTOM',
];
const frequencies: PopupFrequency[] = [
  'ONCE_SESSION',
  'ONCE_DAY',
  'EVERY_VISIT',
  'ONCE_CUSTOMER',
  'ALWAYS_UNTIL_CLOSED',
];
const ctaTypes: PopupCtaType[] = ['ORDER_NOW', 'PREBOOK_NOW', 'WHATSAPP', 'CUSTOM_URL', 'NONE'];

function emptyPopup(): Partial<MarketingAnnouncementDto> {
  return {
    title: '',
    message: '',
    shortMessage: '',
    type: 'POPUP',
    popupType: 'PROMOTIONAL_POSTER',
    status: 'DRAFT',
    priorityLevel: 'PROMOTION',
    priority: 1,
    platform: 'WEBSITE',
    placements: ['POPUP'],
    orderTypes: ['ALL'],
    popupFrequency: 'ONCE_SESSION',
    ctaType: 'ORDER_NOW',
    ctaText: 'Order now',
    ctaUrl: '/menu',
    closeOnOverlay: true,
    imageOnly: false,
    dismissible: true,
    mandatory: false,
    isActive: false,
  };
}

function lifecycle(item: MarketingAnnouncementDto): Exclude<LifecycleFilter, 'ALL'> {
  if (!item.isActive || item.status === 'DRAFT') return 'DISABLED';
  const now = Date.now();
  if (item.startsAt && new Date(item.startsAt).getTime() > now) return 'SCHEDULED';
  if (item.endsAt && new Date(item.endsAt).getTime() < now) return 'EXPIRED';
  return 'ACTIVE';
}

function dateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function formatFrequency(value?: string | null) {
  return (value ?? 'ONCE_SESSION')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function PopupManagementPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<LifecycleFilter>('ALL');
  const [form, setForm] = useState<Partial<MarketingAnnouncementDto> | null>(null);
  const [preview, setPreview] = useState<MarketingAnnouncementDto | null>(null);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ['marketing-popups'],
    queryFn: () => api.get<MarketingAnnouncementDto[]>('/marketing/popups?all=true'),
  });

  const selectedPopup = popups.find((item) => item.id === selectedId) ?? popups[0];
  const { data: analytics } = useQuery({
    queryKey: ['marketing-popup-analytics', selectedPopup?.id],
    queryFn: () =>
      api.get<{
        analytics: MarketingAnnouncementDto['analytics'];
        events: Record<string, number>;
      }>(`/marketing/popups/${selectedPopup!.id}/analytics`),
    enabled: Boolean(selectedPopup?.id),
  });

  const visiblePopups = useMemo(
    () => popups.filter((item) => filter === 'ALL' || lifecycle(item) === filter),
    [filter, popups],
  );

  const save = useMutation({
    mutationFn: (data: Partial<MarketingAnnouncementDto>) => {
      const payload = {
        ...data,
        type: 'POPUP',
        placements: ['POPUP'],
        platform: 'WEBSITE',
        status: data.isActive ? 'PUBLISHED' : 'DRAFT',
        publishedAt: data.isActive ? (data.publishedAt ?? new Date().toISOString()) : null,
      };
      delete payload.id;
      delete payload.analytics;
      delete payload.lifecycle;
      delete payload.promotionProduct;
      delete payload.promotionNextAvailableDate;
      delete payload.promotionNextAvailableLabel;
      return data.id
        ? api.patch(`/marketing/popups/${data.id}`, payload)
        : api.post('/marketing/popups', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketing-popups'] });
      setForm(null);
      toast('Popup saved.');
    },
    onError: () => toast('Unable to save popup. Check the dates and try again.'),
  });

  const toggle = useMutation({
    mutationFn: (item: MarketingAnnouncementDto) =>
      api.post(`/marketing/popups/${item.id}/toggle`, { isActive: !item.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketing-popups'] });
      toast('Popup status updated.');
    },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/popups/${id}/duplicate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketing-popups'] });
      toast('Popup duplicated as a draft.');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/popups/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketing-popups'] });
      toast('Popup deleted.');
    },
  });

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!response.ok) throw new Error('upload failed');
      const result = (await response.json()) as { url?: string };
      if (!result.url) throw new Error('missing URL');
      setForm({ ...form, bannerImageUrl: result.url, heroBannerImageUrl: result.url });
      toast('Popup image uploaded.');
    } catch {
      toast('Image upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const setField = <K extends keyof MarketingAnnouncementDto>(
    key: K,
    value: MarketingAnnouncementDto[K],
  ) => setForm((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#F59E0B]">Marketing · Homepage</p>
          <h1 className="text-3xl font-bold text-[#14532D]">Popup Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish one prioritized, database-driven promotion to the customer homepage.
          </p>
        </div>
        <Button className="gap-2 bg-[#14532D]" onClick={() => setForm(emptyPopup())}>
          <Plus className="h-4 w-4" /> New Popup
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(['ALL', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'] as LifecycleFilter[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl border p-4 text-left transition ${
                filter === item
                  ? 'border-[#14532D] bg-[#14532D] text-white'
                  : 'bg-white hover:border-[#F59E0B]'
              }`}
            >
              <p className="text-xs uppercase tracking-wide opacity-70">{item}</p>
              <p className="mt-1 text-2xl font-bold">
                {item === 'ALL'
                  ? popups.length
                  : popups.filter((popup) => lifecycle(popup) === item).length}
              </p>
            </button>
          ),
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Loading popup campaigns…</div>
          ) : visiblePopups.length === 0 ? (
            <div className="p-10 text-center">
              <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">No popups in this view.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a popup to promote a menu item or offer.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visiblePopups.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[#FFF8E8]">
                    {item.bannerImageUrl || item.heroBannerImageUrl ? (
                      <img
                        src={item.bannerImageUrl ?? item.heroBannerImageUrl ?? ''}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#14532D]">
                        {item.headline || item.title}
                      </h2>
                      <Badge variant={lifecycle(item) === 'ACTIVE' ? 'default' : 'outline'}>
                        {lifecycle(item)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Priority {item.priority ?? 0} · {formatFrequency(item.popupFrequency)} ·{' '}
                      {item.analytics?.impressions ?? 0} impressions
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreview(item)}>
                      <Eye className="mr-1 h-4 w-4" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setForm(item)}>
                      <Pencil className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate.mutate(item.id)}>
                      <Copy className="mr-1 h-4 w-4" /> Duplicate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggle.mutate(item)}>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remove.mutate(item.id)}
                      aria-label="Delete popup"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPopup && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#14532D]">Campaign analytics</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedPopup.headline || selectedPopup.title}
                </p>
              </div>
              <select
                className="rounded-md border bg-white px-3 py-2 text-sm"
                value={selectedPopup.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {popups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.headline || item.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['Impressions', analytics?.analytics?.impressions ?? 0],
                ['Views', analytics?.analytics?.views ?? 0],
                ['CTA clicks', analytics?.analytics?.ctaClicks ?? 0],
                ['Conversions', analytics?.analytics?.conversions ?? 0],
                ['Conversion rate', `${analytics?.analytics?.conversionRate ?? 0}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-[#FFF8E8] p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-[#14532D]">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {form && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-4">
          <Card className="mx-auto max-w-4xl">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#14532D]">
                    {form.id ? 'Edit popup' : 'Create popup'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Changes are saved to the marketing database.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setForm(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Internal title</Label>
                  <Input
                    className="mt-1"
                    value={form.title ?? ''}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Sunday special poster"
                  />
                </div>
                <div>
                  <Label>Popup category</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.popupType ?? ''}
                    onChange={(e) => setField('popupType', e.target.value as PopupContentType)}
                  >
                    {popupTypes.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Headline</Label>
                  <Input
                    className="mt-1"
                    value={form.headline ?? ''}
                    onChange={(e) => setField('headline', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subheadline</Label>
                  <Input
                    className="mt-1"
                    value={form.subheadline ?? ''}
                    onChange={(e) => setField('subheadline', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Message</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={form.message ?? ''}
                    onChange={(e) => setField('message', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Price / offer label</Label>
                  <Input
                    className="mt-1"
                    value={form.price ?? ''}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="₹99 only"
                  />
                </div>
                <div>
                  <Label>Availability label</Label>
                  <Input
                    className="mt-1"
                    value={form.availability ?? ''}
                    onChange={(e) => setField('availability', e.target.value)}
                    placeholder="Every Sunday"
                  />
                </div>
                <div>
                  <Label>Priority (1–10)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    max={10}
                    value={form.priority ?? 1}
                    onChange={(e) => setField('priority', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Display frequency</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.popupFrequency ?? ''}
                    onChange={(e) => setField('popupFrequency', e.target.value as PopupFrequency)}
                  >
                    {frequencies.map((item) => (
                      <option key={item} value={item}>
                        {formatFrequency(item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Starts at</Label>
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={dateInput(form.startsAt)}
                    onChange={(e) =>
                      setField(
                        'startsAt',
                        e.target.value ? new Date(e.target.value).toISOString() : null,
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Ends at</Label>
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={dateInput(form.endsAt)}
                    onChange={(e) =>
                      setField(
                        'endsAt',
                        e.target.value ? new Date(e.target.value).toISOString() : null,
                      )
                    }
                  />
                </div>
                <div>
                  <Label>CTA action</Label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.ctaType ?? 'NONE'}
                    onChange={(e) => setField('ctaType', e.target.value as PopupCtaType)}
                  >
                    {ctaTypes.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>CTA label</Label>
                  <Input
                    className="mt-1"
                    value={form.ctaText ?? ''}
                    onChange={(e) => setField('ctaText', e.target.value)}
                  />
                </div>
                <div>
                  <Label>CTA URL / WhatsApp number</Label>
                  <Input
                    className="mt-1"
                    value={form.ctaUrl ?? ''}
                    onChange={(e) => setField('ctaUrl', e.target.value)}
                    placeholder="/menu or 919876543210"
                  />
                </div>
                <div>
                  <Label>WhatsApp prefilled message</Label>
                  <Input
                    className="mt-1"
                    value={form.ctaMessage ?? ''}
                    onChange={(e) => setField('ctaMessage', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />{' '}
                  {uploading ? 'Uploading…' : 'Upload poster'}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadImage}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.closeOnOverlay !== false}
                    onChange={(e) => setField('closeOnOverlay', e.target.checked)}
                  />{' '}
                  Close on outside click
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.imageOnly === true}
                    onChange={(e) => setField('imageOnly', e.target.checked)}
                  />{' '}
                  Image-only poster
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive === true}
                    onChange={(e) => setField('isActive', e.target.checked)}
                  />{' '}
                  Active immediately
                </label>
              </div>
              {(form.bannerImageUrl || form.heroBannerImageUrl) && (
                <img
                  src={form.bannerImageUrl ?? form.heroBannerImageUrl ?? ''}
                  alt="Popup preview"
                  className="max-h-48 w-full rounded-lg bg-[#FFF8E8] object-contain"
                />
              )}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#14532D]"
                  disabled={save.isPending || !form.title || !form.message}
                  onClick={() => save.mutate(form)}
                >
                  {save.isPending ? 'Saving…' : 'Save popup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={() => preview.closeOnOverlay !== false && setPreview(null)}
        >
          <div
            className={`relative overflow-hidden rounded-2xl bg-[#FFF8E8] shadow-2xl ${previewMobile ? 'w-[360px]' : 'w-full max-w-2xl'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white"
              onClick={() => setPreview(null)}
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            {preview.bannerImageUrl || preview.heroBannerImageUrl ? (
              <img
                src={preview.bannerImageUrl ?? preview.heroBannerImageUrl ?? ''}
                alt=""
                className="max-h-[55vh] w-full object-contain"
              />
            ) : null}
            {!preview.imageOnly && (
              <div className="space-y-2 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#F59E0B]">
                  {preview.popupType?.replaceAll('_', ' ')}
                </p>
                <h2 className="text-2xl font-bold text-[#14532D]">
                  {preview.headline || preview.title}
                </h2>
                {preview.subheadline && <p className="font-medium">{preview.subheadline}</p>}
                <p className="text-muted-foreground">{preview.message}</p>
                {preview.price && (
                  <p className="text-xl font-bold text-[#14532D]">{preview.price}</p>
                )}
                {preview.ctaType !== 'NONE' && (
                  <Button className="w-full bg-[#14532D]">{preview.ctaText || 'Learn more'}</Button>
                )}
              </div>
            )}
            <div className="border-t p-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewMobile((current) => !current)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />{' '}
                {previewMobile ? 'Desktop preview' : 'Mobile preview'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
