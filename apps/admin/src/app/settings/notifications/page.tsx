'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChefHat, Shield, UserCog } from 'lucide-react';
import { Button, Card, CardContent, cn } from '@mdh/ui';
import { api } from '@/lib/api';
import { OrderNotificationEmailsPanel } from '@/components/settings/order-notification-emails-panel';

type StaffPushConfig = {
  enabled: boolean;
  ringtoneEnabled: boolean;
  vibrationEnabled: boolean;
  recipientRoles: string[];
  channelId: string;
  soundName: string;
};

const ROLE_OPTIONS = [
  { key: 'SUPER_ADMIN', label: 'Admin', icon: Shield },
  { key: 'MANAGER', label: 'Manager', icon: UserCog },
  { key: 'KITCHEN_STAFF', label: 'Kitchen', icon: ChefHat },
] as const;

export default function SettingsNotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['staff-push-config'],
    queryFn: () => api.get<StaffPushConfig>('/notifications/staff-push-config'),
  });

  const save = useMutation({
    mutationFn: (body: Partial<StaffPushConfig>) =>
      api.patch<StaffPushConfig>('/notifications/staff-push-config', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-push-config'] }),
  });

  const roles = data?.recipientRoles ?? [];

  const toggleRole = (role: string) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    save.mutate({
      recipientRoles: next.length ? next : ['SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF'],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Email alerts and Admin Android new-order push (FCM/Expo) with custom ringtone.
        </p>
      </div>

      <Card className="dark:bg-gray-900">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#0B3D24]/10 p-2.5 text-[#0B3D24]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Admin app — new order push
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Remote defaults for MDH Admin Android. Device volume/ringtone toggles stay on each
                phone. Closed restaurant = no customer orders = no new-order push.
              </p>
            </div>
          </div>

          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading push settings…</p>
          ) : (
            <>
              <ToggleRow
                label="Enable staff push notifications"
                checked={data.enabled}
                onChange={(v) => save.mutate({ enabled: v })}
                disabled={save.isPending}
              />
              <ToggleRow
                label="Custom ringtone (default on devices)"
                checked={data.ringtoneEnabled}
                onChange={(v) => save.mutate({ ringtoneEnabled: v })}
                disabled={save.isPending}
              />
              <ToggleRow
                label="Vibration (default on devices)"
                checked={data.vibrationEnabled}
                onChange={(v) => save.mutate({ vibrationEnabled: v })}
                disabled={save.isPending}
              />

              <div>
                <p className="text-sm font-medium mb-2">Recipients / roles</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map(({ key, label, icon: Icon }) => {
                    const active = roles.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleRole(key)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition',
                          active
                            ? 'border-[#0B3D24] bg-[#0B3D24] text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Channel: <code>{data.channelId}</code> · Sound: <code>{data.soundName}.wav</code>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900">
        <CardContent className="p-4 sm:p-6">
          <OrderNotificationEmailsPanel />
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5">
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</span>
      <Button
        type="button"
        size="sm"
        variant={checked ? 'default' : 'outline'}
        disabled={disabled}
        className={checked ? 'bg-[#0B3D24] hover:bg-[#0B3D24]/90' : ''}
        onClick={() => onChange(!checked)}
      >
        {checked ? 'On' : 'Off'}
      </Button>
    </div>
  );
}
