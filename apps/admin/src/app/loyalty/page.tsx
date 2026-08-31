'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { Button, Card, CardContent } from '@mdh/ui';
import { api } from '@/lib/api';
import type { LoyaltyDashboardDto } from '@mdh/types';

export default function LoyaltyDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-dashboard'],
    queryFn: () => api.get<LoyaltyDashboardDto>('/loyalty/admin/dashboard'),
  });

  const stats = [
    { label: 'Total Coins Issued', value: data?.totalIssued ?? 0 },
    { label: 'Total Coins Redeemed', value: data?.totalRedeemed ?? 0 },
    { label: 'Outstanding Coins', value: data?.outstanding ?? 0 },
    { label: 'Total Reward Value', value: `₹${data?.rewardValue ?? 0}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#14532D]">🪙 Bronze Coins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loyalty ledger for customers. 1 coin = ₹{data?.coinValue ?? 1}.
          </p>
        </div>
        <Link href="/loyalty/settings">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Loyalty rules
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#14532D]">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF7E6] text-left text-[#14532D]">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Coins</th>
                <th className="px-4 py-3 font-semibold">Earned</th>
                <th className="px-4 py-3 font-semibold">Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : !data?.customers.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No Bronze Coin balances yet.
                  </td>
                </tr>
              ) : (
                data.customers.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || c.email}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-700">{c.available}</td>
                    <td className="px-4 py-3">{c.earned}</td>
                    <td className="px-4 py-3">{c.redeemed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
