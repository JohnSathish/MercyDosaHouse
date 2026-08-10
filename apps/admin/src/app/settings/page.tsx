'use client';

import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { MediaUploader } from '@/components/cms/media-uploader';
import type { BusinessSettingsDto, ThemeSettingsDto } from '@mdh/types';
import { useState, useEffect } from 'react';

function resolveAssetUrl(url?: string | null): string {
  if (!url) return `${APP_URLS.website}/images/logo.png`;
  if (url.startsWith('http')) return url;
  return `${APP_URLS.website}${url.startsWith('/') ? url : `/${url}`}`;
}

function LogoPreview({ url, label }: { url?: string | null; label: string }) {
  const src = resolveAssetUrl(url);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted ring-1 ring-border shadow-sm">
        <Image src={src} alt={label} fill className="object-cover" sizes="80px" unoptimized />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const { data: theme } = useQuery({
    queryKey: ['cms-theme'],
    queryFn: () => api.get<ThemeSettingsDto>('/cms/theme'),
  });

  const [form, setForm] = useState<Partial<BusinessSettingsDto>>({});
  const [themeDraft, setThemeDraft] = useState<Partial<ThemeSettingsDto>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (theme) setThemeDraft(theme);
  }, [theme]);

  const saveBusiness = useMutation({
    mutationFn: (body: Partial<BusinessSettingsDto>) => api.patch('/settings/business', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-business-settings'] });
    },
  });

  const saveTheme = useMutation({
    mutationFn: (body: Partial<ThemeSettingsDto>) => api.patch('/cms/theme', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-theme'] });
      queryClient.invalidateQueries({ queryKey: ['admin-theme-settings'] });
    },
  });

  const activeTheme = { ...theme, ...themeDraft };

  const updateTheme = (patch: Partial<ThemeSettingsDto>) =>
    setThemeDraft((prev: Partial<ThemeSettingsDto>) => ({ ...prev, ...patch }));

  return (
    <div className="w-full max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage restaurant details, brand assets, contact info, and operational configuration.
        </p>
      </div>

      {/* Brand assets */}
      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg">Brand Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-6">
            <LogoPreview url={activeTheme.logoUrl} label="Restaurant Logo" />
            <LogoPreview url={activeTheme.faviconUrl} label="Favicon" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Restaurant Logo</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeTheme.logoUrl ?? ''}
                  onChange={(e) => updateTheme({ logoUrl: e.target.value })}
                  placeholder="/images/logo.png"
                />
                <MediaUploader label="Upload" onUploaded={(url) => updateTheme({ logoUrl: url })} />
              </div>
            </div>
            <div>
              <Label>Favicon</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeTheme.faviconUrl ?? ''}
                  onChange={(e) => updateTheme({ faviconUrl: e.target.value })}
                  placeholder="/favicon.png"
                />
                <MediaUploader
                  label="Upload"
                  onUploaded={(url) => updateTheme({ faviconUrl: url })}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Logo appears in the admin sidebar and website header. For colors and typography, visit{' '}
            <a href="/cms/theme" className="text-[#14532D] underline">
              Theme Builder
            </a>
            .
          </p>
          <Button
            className="bg-[#14532D]"
            onClick={() => saveTheme.mutate(themeDraft)}
            disabled={saveTheme.isPending || Object.keys(themeDraft).length === 0}
          >
            {saveTheme.isPending ? 'Saving…' : 'Save Brand Assets'}
          </Button>
        </CardContent>
      </Card>

      {/* Business details */}
      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg">Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              'businessName',
              'tagline',
              'phone',
              'whatsapp',
              'email',
              'address',
              'openingHours',
              'upiId',
              'gstNumber',
              'websiteUrl',
            ] as const
          ).map((field) => (
            <div key={field}>
              <Label>{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
              <Input
                value={(form[field] as string) || ''}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['deliveryCharge', 'freeDeliveryLimit', 'minOrderAmount'] as const).map((field) => (
              <div key={field}>
                <Label>{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
                <Input
                  type="number"
                  value={form[field] ?? ''}
                  onChange={(e) => setForm({ ...form, [field]: parseFloat(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Delivery charge applies to home-delivery orders. Free delivery threshold waives delivery
            when subtotal meets the limit. Packing charges are configured per menu item under Menu
            Management.
          </p>
          <Button onClick={() => saveBusiness.mutate(form)} disabled={saveBusiness.isPending}>
            {saveBusiness.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg">Thermal Receipt Printing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Controls POS receipt layout, paper width, and auto-print behavior. Changes apply
            immediately on POS terminals.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Paper width</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.receiptPaperWidth ?? '80mm'}
                onChange={(e) =>
                  setForm({ ...form, receiptPaperWidth: e.target.value as '58mm' | '80mm' })
                }
              >
                <option value="80mm">80 mm (default)</option>
                <option value="58mm">58 mm</option>
              </select>
            </div>
            <div>
              <Label>Font size</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.receiptFontSize ?? 'normal'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    receiptFontSize: e.target.value as 'small' | 'normal' | 'large',
                  })
                }
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div>
              <Label>Copies per print</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.receiptCopies ?? 1}
                onChange={(e) =>
                  setForm({ ...form, receiptCopies: parseInt(e.target.value, 10) || 1 })
                }
              />
            </div>
            <div>
              <Label>Footer message</Label>
              <Input
                value={form.receiptFooterMessage ?? 'Thank You!\nVisit Again'}
                onChange={(e) => setForm({ ...form, receiptFooterMessage: e.target.value })}
                placeholder="Thank You! / Visit Again"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {(
              [
                ['receiptShowLogo', 'Show logo'],
                ['receiptShowQr', 'Show QR code'],
                ['receiptShowGst', 'Show GST number'],
                ['receiptShowAddress', 'Show address'],
                ['receiptShowCustomer', 'Show customer'],
                ['receiptShowCashier', 'Show cashier'],
                ['receiptShowPayment', 'Show payment'],
                ['receiptAutoPrintPayment', 'Auto-print after payment'],
                ['receiptAutoPrintKot', 'Auto-print KOT'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key] !== false}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
          <Button onClick={() => saveBusiness.mutate(form)} disabled={saveBusiness.isPending}>
            {saveBusiness.isPending ? 'Saving…' : 'Save Receipt Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
