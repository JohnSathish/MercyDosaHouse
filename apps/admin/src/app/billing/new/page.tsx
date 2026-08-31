'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import { InvoiceForm } from '@/components/billing/invoice-form';
import { api } from '@/lib/api';
import type { InvoiceDto } from '@mdh/types';

function NewInvoiceInner() {
  const params = useSearchParams();
  const from = params.get('from');
  const { data, isLoading } = useQuery({
    queryKey: ['invoice-duplicate', from],
    queryFn: () => api.get<InvoiceDto>(`/invoices/${from}`),
    enabled: Boolean(from),
  });

  const initial =
    from && data
      ? {
          ...data,
          id: '',
          invoiceNumber: '',
          status: 'UNPAID' as const,
          amountPaid: 0,
          balanceDue: data.grandTotal,
          payments: [],
          events: [],
        }
      : null;

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Create Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {from
            ? 'Duplicated from a previous invoice — review and save to assign a new number.'
            : 'Professional invoice for bulk and organisation orders.'}
        </p>
      </div>
      {from && isLoading ? (
        <p className="text-sm text-muted-foreground">Loading previous invoice…</p>
      ) : (
        <InvoiceForm mode="create" initial={initial} />
      )}
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewInvoiceInner />
    </Suspense>
  );
}
