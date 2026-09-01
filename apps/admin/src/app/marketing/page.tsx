'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, Badge, Textarea } from '@mdh/ui';
import { Copy, Megaphone, Trash2, Truck, Eye } from 'lucide-react';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import type {
  DeliveryConfigDto,
  MarketingAnnouncementDto,
  MarketingDashboardDto,
  ProductDto,
} from '@mdh/types';
import { normalizeDeliveryConfigInput } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { API_URL, api } from '@/lib/api';
import { getAccessToken } from '@mdh/auth-client';

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
  promotionDayOfWeek: 0,
  promotionReadyTime: '13:00',
  promotionPreOrderRequired: true,
  promotionPreOrderCutoffDay: 6,
  promotionWebsiteEnabled: true,
  promotionAndroidEnabled: true,
});

export default function MarketingHubPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [tab, setTab] = useState<'dashboard' | 'announcements' | 'delivery'>('dashboard');
  const [form, setForm] = useState<Partial<MarketingAnnouncementDto> | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<Partial<DeliveryConfigDto> | null>(null);
  const promotionImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPromotionImage, setUploadingPromotionImage] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: () => api.get<MarketingDashboardDto>('/marketing/dashboard'),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['marketing-announcements'],
    queryFn: () => api.get<MarketingAnnouncementDto[]>('/marketing/announcements?all=true'),
  });

  const { data: productResult } = useQuery({
    queryKey: ['marketing-products'],
    queryFn: () => api.get<{ data: ProductDto[] }>('/products?available=true&limit=200'),
  });
  const products = productResult?.data ?? [];

  const { data: deliveryConfig } = useQuery({
    queryKey: ['marketing-delivery'],
    queryFn: () => api.get<DeliveryConfigDto | null>('/marketing/delivery-config'),
  });

  const saveAnnouncement = useMutation({
    mutationFn: (data: Partial<MarketingAnnouncementDto>) => {
      const website = data.promotionWebsiteEnabled !== false;
      const android = data.promotionAndroidEnabled !== false;
      const platform =
        website && android ? 'BOTH' : website ? 'WEBSITE' : android ? 'ANDROID' : 'WEBSITE';
      const payload = { ...data };
      delete payload.id;
      delete payload.analytics;
      delete payload.lifecycle;
      delete payload.promotionProduct;
      delete payload.promotionNextAvailableDate;
      delete payload.promotionNextAvailableLabel;
      const normalized = {
        ...payload,
        ...(data.promotionProductId
          ? {
              platform,
              priorityLevel: 'PROMOTION',
              priority: data.priority ?? 100,
              placements: ['HERO_SECTION'],
            }
          : {}),
      };
      return data.id
        ? api.patch(`/marketing/announcements/${data.id}`, normalized)
        : api.post('/marketing/announcements', normalized);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard'] });
      setForm(null);
      toast('Announcement saved.');
    },
  });

  async function uploadPromotionImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !form) return;
    setUploadingPromotionImage(true);
    try {
      const token = getAccessToken();
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!response.ok) throw new Error('Image upload failed');
      const result = (await response.json()) as { url?: string };
      if (!result.url) throw new Error('Image URL missing');
      setForm({ ...form, bannerImageUrl: result.url, heroBannerImageUrl: result.url });
      toast('Promotion image uploaded.');
    } catch {
      toast('Promotion image upload failed.');
    } finally {
      setUploadingPromotionImage(false);
      if (promotionImageInputRef.current) promotionImageInputRef.current.value = '';
    }
  }

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
    mutationFn: (data: Partial<DeliveryConfigDto>) => {
      const toHHmm = (v?: string | null) => {
        if (!v) return null;
        const match = String(v).match(/^(\d{1,2}):(\d{2})/);
        if (!match) return null;
        return `${match[1]!.padStart(2, '0')}:${match[2]}`;
      };
      const normalized = normalizeDeliveryConfigInput({
        status: data.status,
        message: data.message || null,
      });
      return api.patch('/marketing/delivery-config', {
        status: normalized.status,
        areas: data.areas ?? [],
        orderStartTime: toHHmm(data.orderStartTime),
        orderEndTime: toHHmm(data.orderEndTime),
        deliveryStartTime: toHHmm(data.deliveryStartTime),
        deliveryEndTime: toHHmm(data.deliveryEndTime),
        message: normalized.message,
        expansionMessage: data.expansionMessage || null,
        isActive: data.isActive ?? true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-delivery'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard'] });
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
          <Link href="/marketing/popups">
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              Popup Management
            </Button>
          </Link>
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
                <Label>Order Start</Label>
                <Input
                  type="time"
                  value={deliveryForm.orderStartTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, orderStartTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Order End</Label>
                <Input
                  type="time"
                  value={deliveryForm.orderEndTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, orderEndTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Delivery Start</Label>
                <Input
                  type="time"
                  value={deliveryForm.deliveryStartTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, deliveryStartTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Delivery End</Label>
                <Input
                  type="time"
                  value={deliveryForm.deliveryEndTime ?? ''}
                  onChange={(e) =>
                    setDeliveryForm({ ...deliveryForm, deliveryEndTime: e.target.value })
                  }
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
                    <p className="text-xs text-muted-foreground mb-1">
                      Use {'{packingCharge}'}, {'{deliveryCharge}'}, and {'{freeDeliveryLimit}'} to
                      insert live Settings prices.
                    </p>
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
                  <div className="sm:col-span-2 rounded-xl border border-[#14532D]/20 bg-[#F0FDF4] p-4 space-y-4">
                    <div>
                      <p className="font-bold text-[#14532D]">Homepage product promotion</p>
                      <p className="text-xs text-gray-600">
                        Link this promotion to a live product. Its catalog price and image are used
                        automatically.
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Product</Label>
                        <select
                          className="w-full h-10 rounded-md border px-3 text-sm bg-white"
                          value={form.promotionProductId ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              promotionProductId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">No linked product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} · {formatCurrency(product.price)}
                              {!product.isAvailable ? ' · unavailable' : ''}
                            </option>
                          ))}
                        </select>
                        {form.promotionProductId ? (
                          <p className="text-xs text-[#14532D] mt-1">
                            Catalog price:{' '}
                            {formatCurrency(
                              products.find((product) => product.id === form.promotionProductId)
                                ?.price ??
                                form.promotionProduct?.price ??
                                0,
                            )}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <Label>Promotion Image</Label>
                        <input
                          ref={promotionImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => void uploadPromotionImage(event)}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={form.heroBannerImageUrl ?? form.bannerImageUrl ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                heroBannerImageUrl: e.target.value,
                                bannerImageUrl: e.target.value,
                              })
                            }
                            placeholder="/uploads/chicken-biryani.jpg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingPromotionImage}
                            onClick={() => promotionImageInputRef.current?.click()}
                          >
                            {uploadingPromotionImage ? 'Uploading…' : 'Upload'}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Promotion Status</Label>
                        <label className="flex items-center gap-2 h-10 text-sm">
                          <input
                            type="checkbox"
                            checked={form.isActive ?? false}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                          />
                          Show this promotion when published
                        </label>
                      </div>
                      <div>
                        <Label>Promotion Day</Label>
                        <select
                          className="w-full h-10 rounded-md border px-3 text-sm bg-white"
                          value={form.promotionDayOfWeek ?? 0}
                          onChange={(e) =>
                            setForm({ ...form, promotionDayOfWeek: Number(e.target.value) })
                          }
                        >
                          {[
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                          ].map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Homepage preview: Mon–Sat shows “THIS SUNDAY’S SPECIAL”; on the promotion
                          day it shows “TODAY’S SPECIAL”. Sold-out quantity hides the order link.
                        </p>
                      </div>
                      <div>
                        <Label>Ready Time</Label>
                        <Input
                          type="time"
                          value={form.promotionReadyTime ?? '13:00'}
                          onChange={(e) => setForm({ ...form, promotionReadyTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Pre-order Cutoff Day</Label>
                        <select
                          className="w-full h-10 rounded-md border px-3 text-sm bg-white"
                          value={form.promotionPreOrderCutoffDay ?? 6}
                          onChange={(e) =>
                            setForm({ ...form, promotionPreOrderCutoffDay: Number(e.target.value) })
                          }
                        >
                          {[
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                          ].map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.promotionPreOrderRequired ?? true}
                          onChange={(e) =>
                            setForm({ ...form, promotionPreOrderRequired: e.target.checked })
                          }
                        />
                        Pre-order required
                      </label>
                      <div>
                        <Label>Quantity Limit (optional)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.promotionQuantityLimit ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              promotionQuantityLimit: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          placeholder="Unlimited"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.promotionWebsiteEnabled ?? true}
                          onChange={(e) =>
                            setForm({ ...form, promotionWebsiteEnabled: e.target.checked })
                          }
                        />
                        Website enabled
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.promotionAndroidEnabled ?? true}
                          onChange={(e) =>
                            setForm({ ...form, promotionAndroidEnabled: e.target.checked })
                          }
                        />
                        Android app enabled
                      </label>
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
            Product promotions appear on the website homepage immediately after the hero when{' '}
            <strong>Website enabled</strong> is on and the announcement is published. Open the live
            site to preview before customers see a draft.
          </p>
          {form?.promotionProductId ? (
            <div className="mt-3 overflow-hidden rounded-2xl bg-[#14532D] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FBBF24]">
                Sunday Special preview
              </p>
              <p className="mt-1 text-lg font-black">{form.title || 'CHICKEN DUM BIRYANI'}</p>
              <p className="text-sm text-white/75">
                {form.ctaText || 'PRE-BOOK YOUR BIRYANI'} · Ready{' '}
                {form.promotionReadyTime || '13:00'}
              </p>
            </div>
          ) : null}
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
