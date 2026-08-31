'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { InvoiceForm } from '@/components/billing/invoice-form';
import { api } from '@/lib/api';
import type { InvoiceDto } from '@mdh/types';

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDto>(`/invoices/${id}`),
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl sm:text-2xl font-bold">Edit {data.invoiceNumber}</h1>
      <InvoiceForm mode="edit" initial={data} />
    </div>
  );
}
