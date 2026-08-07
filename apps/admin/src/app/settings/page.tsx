'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const [form, setForm] = useState<Partial<BusinessSettingsDto>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: (body: Partial<BusinessSettingsDto>) => api.patch('/settings/business', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Business Settings</h1>
      <Card>
        <CardContent className="p-6 space-y-4 max-w-lg">
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
          <div className="grid grid-cols-3 gap-3">
            {(['deliveryCharge', 'packingCharge', 'minOrderAmount'] as const).map((field) => (
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
          <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
