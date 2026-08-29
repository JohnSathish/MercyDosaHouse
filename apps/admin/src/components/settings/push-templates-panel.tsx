'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';

type Template = { title: string; body: string };
type NotificationConfig = {
  newOrderEnabled: boolean;
  newOrderSound: boolean;
  vibration: boolean;
  customerStatusEnabled: boolean;
  statusEnabled: Record<string, boolean>;
  newOrderTemplate: Template;
  statusTemplates: Record<string, Template>;
};

const STATUS_ROWS = [
  { key: 'PENDING', label: 'Order Placed' },
  { key: 'ACCEPTED', label: 'Order Confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'ASSIGNED', label: 'Delivery Partner Assigned' },
  { key: 'PICKED_UP', label: 'Order Picked Up' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

export function PushTemplatesPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notification-config'],
    queryFn: () => api.get<NotificationConfig>('/notifications/config'),
  });

  const save = useMutation({
    mutationFn: (body: Partial<NotificationConfig>) =>
      api.patch<NotificationConfig>('/notifications/config', body),
    onSuccess: (next) => qc.setQueryData(['notification-config'], next),
  });

  const testPush = useMutation({
    mutationFn: () =>
      api.post<{
        ok: boolean;
        devices: number;
        status: string;
        error?: string;
      }>('/notifications/test-push'),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading templates…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="New Order Notifications"
          checked={data.newOrderEnabled}
          onChange={(newOrderEnabled) => save.mutate({ newOrderEnabled })}
        />
        <Toggle
          label="New Order Sound"
          checked={data.newOrderSound}
          onChange={(newOrderSound) => save.mutate({ newOrderSound })}
        />
        <Toggle
          label="Vibration"
          checked={data.vibration}
          onChange={(vibration) => save.mutate({ vibration })}
        />
        <Toggle
          label="Customer Status Notifications"
          checked={data.customerStatusEnabled}
          onChange={(customerStatusEnabled) => save.mutate({ customerStatusEnabled })}
        />
      </div>

      <div className="rounded-xl border p-3 space-y-2">
        <p className="text-sm font-medium">New order (admin) template</p>
        <Label>Title</Label>
        <Input
          defaultValue={data.newOrderTemplate.title}
          onBlur={(e) => {
            if (e.target.value !== data.newOrderTemplate.title) {
              save.mutate({
                newOrderTemplate: { ...data.newOrderTemplate, title: e.target.value },
              });
            }
          }}
        />
        <Label>Body</Label>
        <Input
          defaultValue={data.newOrderTemplate.body}
          onBlur={(e) => {
            if (e.target.value !== data.newOrderTemplate.body) {
              save.mutate({ newOrderTemplate: { ...data.newOrderTemplate, body: e.target.value } });
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Placeholders: {'{{ORDER_NUMBER}}'} {'{{AMOUNT}}'} {'{{REASON}}'}
        </p>
      </div>

      {STATUS_ROWS.map((row) => {
        const tpl = data.statusTemplates[row.key];
        const on = data.statusEnabled[row.key] !== false;
        return (
          <div key={row.key} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{row.label}</p>
              <Button
                type="button"
                size="sm"
                variant={on ? 'default' : 'outline'}
                className={on ? 'bg-[#0B3D24] hover:bg-[#0B3D24]/90' : ''}
                onClick={() =>
                  save.mutate({
                    statusEnabled: { ...data.statusEnabled, [row.key]: !on },
                  })
                }
              >
                {on ? 'On' : 'Off'}
              </Button>
            </div>
            {tpl ? (
              <>
                <Input
                  defaultValue={tpl.title}
                  onBlur={(e) => {
                    if (e.target.value !== tpl.title) {
                      save.mutate({
                        statusTemplates: {
                          ...data.statusTemplates,
                          [row.key]: { ...tpl, title: e.target.value },
                        },
                      });
                    }
                  }}
                />
                <Input
                  defaultValue={tpl.body}
                  onBlur={(e) => {
                    if (e.target.value !== tpl.body) {
                      save.mutate({
                        statusTemplates: {
                          ...data.statusTemplates,
                          [row.key]: { ...tpl, body: e.target.value },
                        },
                      });
                    }
                  }}
                />
              </>
            ) : null}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        disabled={testPush.isPending}
        onClick={() => testPush.mutate()}
      >
        {testPush.isPending ? 'Sending…' : 'Test Notification'}
      </Button>
      {testPush.data ? (
        <p className={`text-sm ${testPush.data.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
          {testPush.data.ok
            ? `Sent to ${testPush.data.devices} registered device(s) for your login.`
            : `Push ${testPush.data.status.toLowerCase()}: ${
                testPush.data.error ?? 'check device registration and Firebase configuration'
              }`}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        checked ? 'border-[#0B3D24] bg-[#0B3D24] text-white' : 'border-gray-200'
      }`}
    >
      {label}: {checked ? 'ON' : 'OFF'}
    </button>
  );
}
