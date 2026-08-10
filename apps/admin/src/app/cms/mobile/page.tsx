'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, Badge } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { MediaUploader } from '@/components/cms/media-uploader';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { CmsSectionDto, MobileFeatureFlagDto } from '@mdh/types';
import {
  GripVertical,
  Smartphone,
  Palette,
  LayoutGrid,
  ToggleLeft,
  ShieldAlert,
} from 'lucide-react';

type Tab = 'branding' | 'homepage' | 'features' | 'version';

interface MobileAppConfigRow {
  id: string;
  appName: string;
  tagline: string;
  logoUrl?: string | null;
  splashLogoUrl?: string | null;
  splashBackgroundColor: string;
  splashBackgroundImageUrl?: string | null;
  configVersion: number;
  refreshIntervalSeconds: number;
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  minAppVersion: string;
  latestAppVersion: string;
  forceUpdate: boolean;
  softUpdateMessage?: string | null;
  storeOpen: boolean;
  storeClosedMessage?: string | null;
  emergencyNotice?: string | null;
}

interface AdminMobileConfig {
  appConfig: MobileAppConfigRow;
  featureFlags: MobileFeatureFlagDto[];
  homepageSections: CmsSectionDto[];
}

const TABS: { id: Tab; label: string; icon: typeof Smartphone }[] = [
  { id: 'branding', label: 'Branding & Splash', icon: Palette },
  { id: 'homepage', label: 'Homepage Layout', icon: LayoutGrid },
  { id: 'features', label: 'Feature Toggles', icon: ToggleLeft },
  { id: 'version', label: 'Version & Store', icon: ShieldAlert },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 cursor-pointer gap-4">
      <div>
        <p className="font-medium text-[#14532D]">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[#14532D]"
      />
    </label>
  );
}

export default function MobileAppCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [tab, setTab] = useState<Tab>('branding');
  const [draft, setDraft] = useState<Partial<MobileAppConfigRow> | null>(null);
  const [flagDraft, setFlagDraft] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-admin-config'],
    queryFn: () => api.get<AdminMobileConfig>('/mobile/admin/config'),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (payload: Partial<MobileAppConfigRow>) =>
      api.patch('/mobile/admin/config', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-admin-config'] });
      setDraft(null);
      toast('Mobile app settings saved. Config version bumped.');
    },
  });

  const saveFlagsMutation = useMutation({
    mutationFn: (flags: { key: string; enabled: boolean }[]) =>
      api.patch('/mobile/admin/feature-flags', { flags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-admin-config'] });
      setFlagDraft({});
      toast('Feature toggles updated.');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number; isEnabled?: boolean }[]) =>
      api.patch('/mobile/admin/home-sections/reorder', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-admin-config'] });
      toast('Homepage layout updated.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post('/mobile/admin/home-sections/publish', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-admin-config'] });
      toast('Mobile homepage published to all apps.');
    },
  });

  const config = useMemo(() => ({ ...data?.appConfig, ...draft }), [data?.appConfig, draft]);
  const sections = data?.homepageSections ?? [];
  const flags = data?.featureFlags ?? [];

  const update = (patch: Partial<MobileAppConfigRow>) =>
    setDraft((prev) => ({ ...(data?.appConfig ?? {}), ...prev, ...patch }));

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(
      next.map((s, i) => ({ id: s.id, sortOrder: i + 1, isEnabled: s.isEnabled })),
    );
  };

  const toggleSection = (section: CmsSectionDto) => {
    reorderMutation.mutate([
      {
        id: section.id,
        sortOrder: section.sortOrder,
        isEnabled: !section.isEnabled,
      },
    ]);
  };

  if (isLoading || !data?.appConfig) {
    return <p className="text-gray-500 p-6">Loading mobile app configuration...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <CmsPageHeader
          title="Mobile App Configuration"
          description="Control branding, homepage layout, feature toggles, and remote config for Android apps — no Play Store update needed."
        />
        <Badge variant="outline" className="gap-1 shrink-0 mt-1">
          <Smartphone className="h-3.5 w-3.5" /> Config v{data.appConfig.configVersion}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={tab === id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(id)}
            className="gap-1.5"
          >
            <Icon className="h-4 w-4" /> {label}
          </Button>
        ))}
      </div>

      {tab === 'branding' && (
        <Card className="max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>App Name</Label>
              <Input value={config.appName} onChange={(e) => update({ appName: e.target.value })} />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={config.tagline} onChange={(e) => update({ tagline: e.target.value })} />
            </div>
            <div>
              <Label>Splash Background Color</Label>
              <Input
                type="color"
                value={config.splashBackgroundColor}
                onChange={(e) => update({ splashBackgroundColor: e.target.value })}
              />
            </div>
            <div>
              <Label>App Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  value={config.logoUrl ?? ''}
                  onChange={(e) => update({ logoUrl: e.target.value })}
                />
                <MediaUploader onUploaded={(url) => update({ logoUrl: url })} />
              </div>
            </div>
            <div>
              <Label>Splash Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  value={config.splashLogoUrl ?? ''}
                  onChange={(e) => update({ splashLogoUrl: e.target.value })}
                />
                <MediaUploader onUploaded={(url) => update({ splashLogoUrl: url })} />
              </div>
            </div>
            <div>
              <Label>Splash Background Image URL</Label>
              <div className="flex gap-2">
                <Input
                  value={config.splashBackgroundImageUrl ?? ''}
                  onChange={(e) => update({ splashBackgroundImageUrl: e.target.value })}
                />
                <MediaUploader onUploaded={(url) => update({ splashBackgroundImageUrl: url })} />
              </div>
            </div>
            <div>
              <Label>Config Refresh Interval (seconds)</Label>
              <Input
                type="number"
                min={60}
                value={config.refreshIntervalSeconds}
                onChange={(e) => update({ refreshIntervalSeconds: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">
                How often the app re-fetches remote config in the background.
              </p>
            </div>
            <Button
              className="bg-[#14532D]"
              onClick={() => saveConfigMutation.mutate(draft ?? {})}
              disabled={!draft || saveConfigMutation.isPending}
            >
              Save Branding
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'homepage' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Reorder sections and toggle visibility without a Play Store release. Menu items,
                prices, and offers are pulled live from Menu Management and Offers CMS.
              </p>
              <ul className="space-y-2">
                {[...sections]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((section, index) => (
                    <li
                      key={section.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#14532D] truncate">
                          {section.title ?? section.sectionKey}
                        </p>
                        <p className="text-xs text-gray-500">{section.sectionKey}</p>
                      </div>
                      <Badge variant={section.status === 'PUBLISHED' ? 'default' : 'outline'}>
                        {section.status}
                      </Badge>
                      <input
                        type="checkbox"
                        checked={section.isEnabled}
                        onChange={() => toggleSection(section)}
                        className="h-5 w-5 accent-[#14532D]"
                        aria-label={`Toggle ${section.sectionKey}`}
                      />
                      <div className="flex flex-col gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => moveSection(index, 1)}
                          disabled={index === sections.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
              <div className="flex gap-2 mt-4">
                <Button
                  className="bg-[#14532D]"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                >
                  Publish Homepage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'features' && (
        <Card className="max-w-2xl">
          <CardContent className="p-6 space-y-3">
            <p className="text-sm text-gray-600 mb-2">
              Enable or disable mobile features remotely. Disabled features are hidden in the app
              instantly.
            </p>
            {flags.map((flag) => {
              const enabled = flagDraft[flag.key] ?? flag.enabled;
              return (
                <ToggleRow
                  key={flag.key}
                  label={flag.label}
                  description={flag.description ?? undefined}
                  checked={enabled}
                  onChange={(checked) => setFlagDraft((prev) => ({ ...prev, [flag.key]: checked }))}
                />
              );
            })}
            <Button
              className="bg-[#14532D]"
              onClick={() =>
                saveFlagsMutation.mutate(
                  flags.map((f) => ({
                    key: f.key,
                    enabled: flagDraft[f.key] ?? f.enabled,
                  })),
                )
              }
              disabled={!Object.keys(flagDraft).length || saveFlagsMutation.isPending}
            >
              Save Feature Toggles
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'version' && (
        <Card className="max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum App Version</Label>
                <Input
                  value={config.minAppVersion}
                  onChange={(e) => update({ minAppVersion: e.target.value })}
                />
              </div>
              <div>
                <Label>Latest App Version</Label>
                <Input
                  value={config.latestAppVersion}
                  onChange={(e) => update({ latestAppVersion: e.target.value })}
                />
              </div>
            </div>
            <ToggleRow
              label="Force Update"
              description="Block app usage until user updates"
              checked={config.forceUpdate}
              onChange={(checked) => update({ forceUpdate: checked })}
            />
            <div>
              <Label>Soft Update Message</Label>
              <Input
                value={config.softUpdateMessage ?? ''}
                onChange={(e) => update({ softUpdateMessage: e.target.value })}
                placeholder="A new version is available with improvements."
              />
            </div>
            <ToggleRow
              label="Maintenance Mode"
              description="Show maintenance screen in the app"
              checked={config.maintenanceMode}
              onChange={(checked) => update({ maintenanceMode: checked })}
            />
            <div>
              <Label>Maintenance Message</Label>
              <Input
                value={config.maintenanceMessage ?? ''}
                onChange={(e) => update({ maintenanceMessage: e.target.value })}
                placeholder="We are temporarily closed for maintenance."
              />
            </div>
            <ToggleRow
              label="Store Open"
              description="Allow new orders from the app"
              checked={config.storeOpen}
              onChange={(checked) => update({ storeOpen: checked })}
            />
            <div>
              <Label>Store Closed Message</Label>
              <Input
                value={config.storeClosedMessage ?? ''}
                onChange={(e) => update({ storeClosedMessage: e.target.value })}
                placeholder="We are currently closed. Please check back during working hours."
              />
            </div>
            <div>
              <Label>Emergency Notice</Label>
              <Input
                value={config.emergencyNotice ?? ''}
                onChange={(e) => update({ emergencyNotice: e.target.value })}
                placeholder="Kitchen closed today due to maintenance."
              />
            </div>
            <Button
              className="bg-[#14532D]"
              onClick={() => saveConfigMutation.mutate(draft ?? {})}
              disabled={!draft || saveConfigMutation.isPending}
            >
              Save Version & Store Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
