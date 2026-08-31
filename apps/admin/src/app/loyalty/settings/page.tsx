'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { LoyaltyConfigDto } from '@mdh/types';

const STATUSES = ['DELIVERED', 'READY', 'SERVED'] as const;

export default function LoyaltySettingsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { data } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: () => api.get<LoyaltyConfigDto>('/loyalty/admin/settings'),
  });
  const [form, setForm] = useState<LoyaltyConfigDto | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: LoyaltyConfigDto) =>
      api.patch<LoyaltyConfigDto>('/loyalty/admin/settings', body),
    onSuccess: (next) => {
      qc.setQueryData(['loyalty-settings'], next);
      toast('Bronze Coins settings saved.');
    },
    onError: (e: Error) => toast(e.message),
  });

  if (!form) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = <K extends keyof LoyaltyConfigDto>(key: K, value: LoyaltyConfigDto[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const toggleStatus = (status: string, on: boolean) => {
    const next = on
      ? Array.from(new Set([...form.eligibleStatuses, status]))
      : form.eligibleStatuses.filter((s) => s !== status);
    set('eligibleStatuses', next.length ? next : ['DELIVERED']);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#14532D]">Loyalty & Rewards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Change earning and redemption without rebuilding the apps. 1 Bronze Coin = ₹
          {form.coinValue}.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Loyalty program</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
            />
            Enable Bronze Coins
          </label>
          <Field label="Coin name" value={form.coinName} onChange={(v) => set('coinName', v)} />
          <Field
            label="Coin symbol"
            value={form.coinSymbol}
            onChange={(v) => set('coinSymbol', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Earning</h2>
          <label className="text-sm font-medium">Earn mode</label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={form.earnMode}
            onChange={(e) => set('earnMode', e.target.value as LoyaltyConfigDto['earnMode'])}
          >
            <option value="PER_ORDER">1 completed order = N coins</option>
            <option value="PER_AMOUNT">₹ spent = 1 coin</option>
          </select>
          {form.earnMode === 'PER_ORDER' ? (
            <Field
              label="Coins per completed order"
              value={String(form.coinsPerOrder)}
              onChange={(v) => set('coinsPerOrder', Number(v) || 0)}
            />
          ) : (
            <Field
              label="₹ per 1 coin"
              value={String(form.amountPerCoin)}
              onChange={(v) => set('amountPerCoin', Number(v) || 1)}
            />
          )}
          <Field
            label="Value per coin (₹)"
            value={String(form.coinValue)}
            onChange={(v) => set('coinValue', Number(v) || 0)}
          />
          <Field
            label="Minimum order required to earn"
            value={String(form.minOrderToEarn)}
            onChange={(v) => set('minOrderToEarn', Number(v) || 0)}
          />
          <p className="text-sm font-medium">Eligible order status</p>
          {STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.eligibleStatuses.includes(s)}
                onChange={(e) => toggleStatus(s, e.target.checked)}
              />
              {s === 'DELIVERED' ? 'Delivered / completed' : s}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.earnOnCancelled}
              onChange={(e) => set('earnOnCancelled', e.target.checked)}
            />
            Cancelled orders earn coins
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.earnOnRefunded}
              onChange={(e) => set('earnOnRefunded', e.target.checked)}
            />
            Refunded orders keep earned coins
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Redemption</h2>
          <Field
            label="Minimum coins required"
            value={String(form.minRedeem)}
            onChange={(v) => set('minRedeem', Number(v) || 0)}
          />
          <Field
            label="Maximum coins per order"
            value={String(form.maxRedeemPerOrder)}
            onChange={(v) => set('maxRedeemPerOrder', Number(v) || 0)}
          />
          <Field
            label="Maximum discount (₹)"
            value={String(form.maxDiscount)}
            onChange={(v) => set('maxDiscount', Number(v) || 0)}
          />
          <Field
            label="Minimum order value to redeem"
            value={String(form.minOrderToRedeem)}
            onChange={(v) => set('minOrderToRedeem', Number(v) || 0)}
          />
          <Field
            label="Expiry days (0 = never)"
            value={String(form.expiryDays)}
            onChange={(v) => set('expiryDays', Number(v) || 0)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowWithCoupons}
              onChange={(e) => set('allowWithCoupons', e.target.checked)}
            />
            Allow with coupons
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowWithPromo}
              onChange={(e) => set('allowWithPromo', e.target.checked)}
            />
            Allow with promotional discounts
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowOnDelivery}
              onChange={(e) => set('allowOnDelivery', e.target.checked)}
            />
            Coins can cover delivery / packing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowOnTax}
              onChange={(e) => set('allowOnTax', e.target.checked)}
            />
            Coins can cover taxes
          </label>
        </CardContent>
      </Card>

      <Button
        className="bg-[#14532D] text-white"
        disabled={save.isPending}
        onClick={() => save.mutate(form)}
      >
        Save rules
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
