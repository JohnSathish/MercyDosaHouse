'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import { downloadInvoicePdf, inr, previewInvoicePdf, printInvoicePdf } from '@/lib/invoice-pdf';
import type { InvoiceDto, InvoicePaymentMethod } from '@mdh/types';
import {
  INVOICE_PAYMENT_METHODS,
  INVOICE_PAYMENT_METHOD_LABELS,
  INVOICE_STATUS_LABELS,
} from '@mdh/types';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created') === '1';
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDto>(`/invoices/${id}`),
  });

  const [emailTo, setEmailTo] = useState('');
  const [wa, setWa] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<InvoicePaymentMethod>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const emailMut = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/email`, { to: emailTo || inv?.email }),
    onSuccess: () => {
      toast('Invoice emailed.');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: (e: Error) => toast(e.message),
  });
  const waMut = useMutation({
    mutationFn: () =>
      api.post<{ sent: boolean; fallbackUrl?: string; error?: string }>(
        `/invoices/${id}/whatsapp`,
        {
          whatsapp: wa || inv?.whatsapp || inv?.phone,
        },
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      if (res.sent) toast('Invoice sent on WhatsApp.');
      else if (res.fallbackUrl) {
        window.open(res.fallbackUrl, '_blank', 'noopener,noreferrer');
        toast(res.error || 'Opened WhatsApp with a pre-filled message.');
      }
    },
    onError: (e: Error) => toast(e.message),
  });
  const payMut = useMutation({
    mutationFn: () =>
      api.post(`/invoices/${id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
        reference: payRef || null,
        notes: payNotes || null,
        paidAt: payDate,
      }),
    onSuccess: () => {
      toast('Payment recorded.');
      setPayAmount('');
      setPayRef('');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoice-stats'] });
    },
    onError: (e: Error) => toast(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/cancel`, { reason: 'Cancelled by admin' }),
    onSuccess: () => {
      toast('Invoice cancelled.');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: (e: Error) => toast(e.message),
  });
  const shareMut = useMutation({
    mutationFn: () => api.post<{ url: string }>(`/invoices/${id}/share`, {}),
    onSuccess: async (res) => {
      try {
        await navigator.clipboard.writeText(res.url);
        toast('Secure invoice link copied.');
      } catch {
        toast(res.url);
      }
    },
  });

  if (isLoading || !inv) return <p className="text-sm text-muted-foreground">Loading invoice…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      {created ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 font-medium">
          Invoice created successfully ✓
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mercy Dosa House</p>
          <h1 className="text-2xl font-bold text-[#14532D]">{inv.invoiceNumber}</h1>
          <p className="text-sm mt-1">{inv.customerName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{inr(inv.grandTotal)}</p>
          <p className="text-sm font-semibold text-[#14532D]">
            {INVOICE_STATUS_LABELS[inv.status]}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            downloadInvoicePdf(inv.id, `${inv.invoiceNumber}.pdf`).catch((e) => toast(e.message))
          }
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => previewInvoicePdf(inv.id).catch((e) => toast(e.message))}
        >
          Preview
        </Button>
        <Button
          variant="outline"
          onClick={() => printInvoicePdf(inv.id).catch((e) => toast(e.message))}
        >
          Print
        </Button>
        <Button variant="outline" onClick={() => shareMut.mutate()}>
          Share
        </Button>
        <Link href={`/billing/${inv.id}/edit`}>
          <Button variant="outline">Edit</Button>
        </Link>
        <Link href={`/billing/new?from=${inv.id}`}>
          <Button variant="outline">Duplicate</Button>
        </Link>
        {inv.status !== 'CANCELLED' ? (
          <Button variant="outline" className="text-red-600" onClick={() => cancelMut.mutate()}>
            Cancel invoice
          </Button>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <Meta label="Invoice Date" value={new Date(inv.invoiceDate).toLocaleDateString('en-IN')} />
        <Meta label="Due Date" value={new Date(inv.dueDate).toLocaleDateString('en-IN')} />
        <Meta label="Items" value={String(inv.items.length)} />
        <Meta label="Amount Paid" value={inr(inv.amountPaid)} />
        <Meta label="Balance" value={inr(inv.balanceDue)} />
        <Meta label="Amount in words" value={inv.amountInWords} />
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={item.id} className="border-t">
                  <td className="py-2">{i + 1}</td>
                  <td>
                    {item.description}
                    {item.notes ? (
                      <div className="text-xs text-muted-foreground">{item.notes}</div>
                    ) : null}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{inr(item.unitPrice)}</td>
                  <td className="text-right">{inr(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">Send via Email</h2>
            <Input
              placeholder={inv.email || 'Customer email'}
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
            <Button
              className="bg-[#14532D]"
              disabled={emailMut.isPending}
              onClick={() => emailMut.mutate()}
            >
              Send via Email
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">Send via WhatsApp</h2>
            <Input
              placeholder={inv.whatsapp || inv.phone || 'WhatsApp number'}
              value={wa}
              onChange={(e) => setWa(e.target.value)}
            />
            <Button
              className="bg-[#14532D]"
              disabled={waMut.isPending}
              onClick={() => waMut.mutate()}
            >
              Send via WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>

      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">Record Payment</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Method</Label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as InvoicePaymentMethod)}
                >
                  {INVOICE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {INVOICE_PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Transaction / reference</Label>
                <Input
                  className="mt-1"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input
                  className="mt-1"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>
            </div>
            <Button disabled={payMut.isPending} onClick={() => payMut.mutate()}>
              Record payment
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {inv.previousInvoices?.length ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold">Customer billing history</h2>
            {inv.previousInvoices.map((p) => (
              <Link
                key={p.id}
                href={`/billing/${p.id}`}
                className="flex justify-between text-sm py-1 border-b last:border-0"
              >
                <span>{p.invoiceNumber}</span>
                <span>
                  {inr(p.grandTotal)} · {INVOICE_STATUS_LABELS[p.status]}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="font-semibold">Audit trail</h2>
          {(inv.events || []).map((e) => (
            <div key={e.id} className="text-sm border-b last:border-0 py-2">
              <p className="font-medium">{e.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString('en-IN')}{' '}
                {e.userName ? `· ${e.userName}` : ''} {e.detail ? `· ${e.detail}` : ''}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => router.push('/billing')}>
        Back to invoices
      </Button>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
