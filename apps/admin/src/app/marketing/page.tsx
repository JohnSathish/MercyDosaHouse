'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, Badge, Textarea } from '@mdh/ui';
import { Copy, Megaphone, Trash2, Truck, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import type {
  DeliveryConfigDto,
  MarketingAnnouncementDto,
  MarketingDashboardDto,
} from '@mdh/types';

const PLACEMENTS = [
  'TOP_BAR',
  'HERO_SECTION',
  'DELIVERY_CARD',
  'POPUP',
  'CHECKOUT',
  'APP_HOME',
  'ORDER_TRACKING',
  'HOME_BOLD_BANNER',
] as const;

const PRIORITIES = [
  'EMERGENCY',
  'DELIVERY_UPDATE',
  'IMPORTANT_NOTICE',
  'PROMOTION',
  'GENERAL',
] as const;

const emptyAnnouncement = (): Partial<MarketingAnnouncementDto> => ({
  title: '',
  message: '',
  shortMessage: '',
  type: 'BAR',
  status: 'DRAFT',
  priorityLevel: 'DELIVERY_UPDATE',
  platform: 'BOTH',
  placements: ['TOP_BAR'],
  orderTypes: ['ALL'],
  dismissible: true,
  mandatory: false,
  isActive: false,
  icon: '🚚',
});

export default function MarketingHubPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [tab, setTab] = useState<'dashboard' | 'announcements' | 'delivery'>('dashboard');
  const [form, setForm] = useState<Partial<MarketingAnnouncementDto> | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<Partial<DeliveryConfigDto> | null>(null);

  const { data: dashboard } = useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: () => api.get<MarketingDashboardDto>('/marketing/dashboard'),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['marketing-announcements'],
    queryFn: () => api.get<MarketingAnnouncementDto[]>('/marketing/announcements?all=true'),
  });

  const { data: deliveryConfig } = useQuery({
    queryKey: ['marketing-delivery'],
    queryFn: () => api.get<DeliveryConfigDto | null>('/marketing/delivery-config'),
  });

  const saveAnnouncement = useMutation({
    mutationFn: (data: Partial<MarketingAnnouncementDto>) =>
      data.id
        ? api.patch(`/marketing/announcements/${data.id}`, data)
        : api.post('/marketing/announcements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard'] });
      setForm(null);
      toast('Announcement saved.');
    },
  });

  const publishAnnouncement = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/announcements/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-announcements'] });
      toast('Announcement published.');
    },
  });

  const duplicateAnnouncement = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/announcements/${id}/duplicate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-announcements'] }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-announcements'] }),
  });

  const saveDelivery = useMutation({
    mutationFn: (data: Partial<DeliveryConfigDto>) =>
      api.patch('/marketing/delivery-config', {
        status: data.status,
        areas: data.areas ?? [],
        orderStartTime: data.orderStartTime || null,
        orderEndTime: data.orderEndTime || null,
        deliveryStartTime: data.deliveryStartTime || null,
        deliveryEndTime: data.deliveryEndTime || null,
        message: data.message || null,
        expansionMessage: data.expansionMessage || null,
        isActive: data.isActive ?? true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-delivery'] });
      setDeliveryForm(null);
      toast('Delivery configuration saved.');
    },
    onError: () => toast('Failed to save delivery configuration.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14532D] flex items-center gap-2">
            <Megaphone className="w-7 h-7" />
            Announcements & Promotions
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Single source of truth for website and Android app messaging.
          </p>
        </div>
        <div className="flex gap-2">
          {(['dashboard', 'announcements', 'delivery'] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? 'default' : 'outline'}
              className={tab === t ? 'bg-[#14532D]' : ''}
              onClick={() => setTab(t)}
            >
              {t === 'dashboard'
                ? 'Dashboard'
                : t === 'announcements'
                  ? 'Announcements'
                  : 'Delivery'}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && dashboard && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Active Announcements</p>
              <p className="text-3xl font-bold text-[#14532D]">{dashboard.announcements.active}</p>
              <p className="text-xs text-gray-400 mt-2">
                Scheduled {dashboard.announcements.scheduled} · Drafts{' '}
                {dashboard.announcements.drafts}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Active Offers</p>
              <p className="text-3xl font-bold text-[#F59E0B]">
                {dashboard.promotions.activeOffers}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Truck className="w-4 h-4" /> Delivery Status
              </p>
              <p className="text-lg font-bold text-[#14532D] mt-1">
                {dashboard.delivery.status.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {dashboard.delivery.activeAreas.join(', ') || 'No areas'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'delivery' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Delivery Information</h2>
              <Button
                variant="outline"
                onClick={() =>
                  setDeliveryForm(
                    deliveryConfig ?? {
                      status: 'LIMITED_AREA',
                      areas: [],
                      isActive: true,
                    },
                  )
                }
              >
                Edit Configuration
              </Button>
            </div>
            {deliveryConfig ? (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p>
                  <strong>Status:</strong> {deliveryConfig.status}
                </p>
                <p>
                  <strong>Areas:</strong> {deliveryConfig.areas.join(', ')}
                </p>
                <p>
                  <strong>Order window:</strong> {deliveryConfig.orderWindow ?? '—'}
                </p>
                <p>
                  <strong>Delivery window:</strong> {deliveryConfig.deliveryWindow ?? '—'}
                </p>
                <p className="sm:col-span-2">
                  <strong>Message:</strong> {deliveryConfig.message}
                </p>
                <p className="sm:col-span-2 text-[#F59E0B]">{deliveryConfig.expansionMessage}</p>
              </div>
            ) : (
              <p className="text-gray-500">No delivery configuration yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {deliveryForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold">Edit Delivery Configuration</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={deliveryForm.status ?? 'LIMITED_AREA'}
                  onChange={(e) =>
                    setDeliveryForm({
                      ...deliveryForm,
                      status: e.target.value as DeliveryConfigDto['status'],
                    })
                  }
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="LIMITED_AREA">Limited Area</option>
                  <option value="TEMPORARILY_UNAVAILABLE">Temporarily Unavailable</option>
                  <option value="COMING_SOON">Coming Soon</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Use &quot;Temporarily Unavailable&quot; for pickup-only. Website shows Delivery
                  Message and hides area/time windows.
                </p>
              </div>
              <div>
                <Label>Areas (comma-separated)</Label>
                <Input
                  value={(deliveryForm.areas ?? []).join(', ')}
                  onChange={(e) =>
                    setDeliveryForm({
                      ...deliveryForm,
                      areas: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Walbakgre, Holy Cross Hospital Area"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Area names only when delivery is available. Put notice text in Delivery Message.
                </p>
              </div>
              <div>
                <Label>Order Start (HH:mm)</Label>
                <Input
                  value={deliveryForm.orderStartTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, orderStartTime: e.target.value })
                  }
                  placeholder="15:00"
                />
              </div>
              <div>
                <Label>Order End (HH:mm)</Label>
                <Input
                  value={deliveryForm.orderEndTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, orderEndTime: e.target.value })
                  }
                  placeholder="16:00"
                />
              </div>
              <div>
                <Label>Delivery Start (HH:mm)</Label>
                <Input
                  value={deliveryForm.deliveryStartTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, deliveryStartTime: e.target.value })
                  }
                  placeholder="17:30"
                />
              </div>
              <div>
                <Label>Delivery End (HH:mm)</Label>
                <Input
                  value={deliveryForm.deliveryEndTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, deliveryEndTime: e.target.value })
                  }
                  placeholder="18:00"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Delivery Message</Label>
                <Textarea
                  value={deliveryForm.message ?? ''}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, message: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Expansion Message</Label>
                <Textarea
                  value={deliveryForm.expansionMessage ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, expansionMessage: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-[#14532D]" onClick={() => saveDelivery.mutate(deliveryForm)}>
                Save & Publish
              </Button>
              <Button variant="outline" onClick={() => setDeliveryForm(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'announcements' && (
        <>
          <div className="flex justify-end">
            <Button className="bg-[#14532D]" onClick={() => setForm(emptyAnnouncement())}>
              + New Announcement
            </Button>
          </div>

          {form && (
            <Card>
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
                    <Label>Icon / Emoji</Label>
                    <Input
                      value={form.icon ?? ''}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Message</Label>
                    <Textarea
                      value={form.message ?? ''}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <select
                      className="w-full h-10 rounded-md border px-3 text-sm"
                      value={form.priorityLevel ?? 'GENERAL'}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          priorityLevel: e.target
                            .value as MarketingAnnouncementDto['priorityLevel'],
                        })
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <select
                      className="w-full h-10 rounded-md border px-3 text-sm"
                      value={form.platform ?? 'BOTH'}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          platform: e.target.value as MarketingAnnouncementDto['platform'],
                        })
                      }
                    >
                      <option value="WEBSITE">Website</option>
                      <option value="ANDROID">Android App</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Placements</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {PLACEMENTS.map((p) => {
                        const selected = (form.placements ?? []).includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            className={`px-2 py-1 rounded text-xs border ${selected ? 'bg-[#14532D] text-white' : 'bg-white'}`}
                            onClick={() => {
                              const next = selected
                                ? (form.placements ?? []).filter((x) => x !== p)
                                : [...(form.placements ?? []), p];
                              setForm({ ...form, placements: next });
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={form.startsAt?.slice(0, 16) ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="datetime-local"
                      value={form.endsAt?.slice(0, 16) ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>CTA Text</Label>
                    <Input
                      value={form.ctaText ?? ''}
                      onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CTA URL</Label>
                    <Input
                      value={form.ctaUrl ?? ''}
                      onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.dismissible ?? true}
                      onChange={(e) => setForm({ ...form, dismissible: e.target.checked })}
                    />
                    Dismissible
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.mandatory ?? false}
                      onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
                    />
                    Mandatory popup
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => saveAnnouncement.mutate(form)}>
                    Save Draft
                  </Button>
                  {form.id && (
                    <Button
                      className="bg-[#F59E0B] text-[#1F2937]"
                      onClick={() => publishAnnouncement.mutate(form.id!)}
                    >
                      Publish
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setForm(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {announcements.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex flex-wrap justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">
                        {item.icon} {item.title}
                      </p>
                      <Badge>{item.lifecycle ?? item.status}</Badge>
                      <Badge variant="outline">{item.platform}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(item.placements ?? []).join(' · ')}
                    </p>
                    {item.analytics && (
                      <p className="text-xs text-[#14532D] mt-2">
                        Views {item.analytics.views} · CTA {item.analytics.ctaClicks} · Orders{' '}
                        {item.analytics.conversions}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setForm(item)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateAnnouncement.mutate(item.id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {item.status !== 'PUBLISHED' && (
                      <Button
                        size="sm"
                        className="bg-[#14532D]"
                        onClick={() => publishAnnouncement.mutate(item.id)}
                      >
                        Publish
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => deleteAnnouncement.mutate(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card className="bg-[#14532D]/5 border-[#14532D]/20">
        <CardContent className="p-4 text-sm text-gray-700">
          <p className="font-semibold text-[#14532D] flex items-center gap-2">
            <Eye className="w-4 h-4" /> Preview
          </p>
          <p className="mt-1">
            Changes publish instantly to the website and Android app via API — no rebuild required.
          </p>
          <Link
            href={APP_URLS.website}
            target="_blank"
            className="text-[#14532D] underline mt-2 inline-block"
          >
            Open website preview
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
