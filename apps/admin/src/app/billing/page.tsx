'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Input } from '@mdh/ui';
import { api } from '@/lib/api';
import { inr } from '@/lib/invoice-pdf';
import type {
  InvoiceListItemDto,
  InvoiceStatsDto,
  InvoiceStatus,
  PaginatedResult,
} from '@mdh/types';
import { INVOICE_CUSTOMER_TYPE_LABELS, INVOICE_STATUS_LABELS } from '@mdh/types';

const FILTERS: { id: 'all' | InvoiceStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PAID', label: 'Paid' },
  { id: 'UNPAID', label: 'Unpaid' },
  { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function BillingPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [search, setSearch] = useState('');
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('status', filter);
    if (search.trim()) p.set('search', search.trim());
    return p.toString();
  }, [filter, search]);

  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => api.get<InvoiceStatsDto>('/invoices/stats'),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', qs],
    queryFn: () => api.get<PaginatedResult<InvoiceListItemDto>>(`/invoices${qs ? `?${qs}` : ''}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bulk orders for organisations, families, and events.
          </p>
        </div>
        <Link href="/billing/new">
          <Button className="bg-[#14532D]">+ Create New Invoice</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Today's Invoices" value={inr(stats?.todayTotal ?? 0)} />
        <Stat label="This Month" value={inr(stats?.monthTotal ?? 0)} />
        <Stat label="Pending Payment" value={inr(stats?.pendingPayment ?? 0)} />
        <Stat label="Paid Invoices" value={String(stats?.paidCount ?? 0)} />
        <Stat label="Outstanding" value={inr(stats?.outstanding ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === f.id ? 'bg-[#14532D] text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Input
        placeholder="Search invoice number, customer, phone, email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : !data?.data.length ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    No invoices yet. Create one for a bulk order.
                  </td>
                </tr>
              ) : (
                data.data.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-[#FFF8E8]/50">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/billing/${inv.id}`} className="text-[#14532D]">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.customerName}</td>
                    <td className="px-4 py-3">{INVOICE_CUSTOMER_TYPE_LABELS[inv.customerType]}</td>
                    <td className="px-4 py-3">{inr(inv.grandTotal)}</td>
                    <td className="px-4 py-3">{INVOICE_STATUS_LABELS[inv.status]}</td>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-[#14532D] mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
