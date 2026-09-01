'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { InvoiceConfigDto, InvoiceTaxType } from '@mdh/types';

export default function BillingSettingsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { data } = useQuery({
    queryKey: ['settings-invoice'],
    queryFn: () => api.get<InvoiceConfigDto>('/settings/invoice'),
  });
  const [form, setForm] = useState<InvoiceConfigDto | null>(null);
  useEffect(() => {
    if (!data) return;
    setForm({
      ...data,
      email: {
        autoSend: false,
        senderName: 'Mercy Dosa House',
        senderEmail: '',
        replyTo: '',
        phone: '',
        address: '',
        website: '',
        logoUrl: '',
        subject: 'Invoice {{invoice_number}} | Mercy Dosa House',
        overdueSubject: 'Payment Reminder — Invoice {{invoice_number}} | Mercy Dosa House',
        footer: 'Thank you for your trust and continued support!',
        ...data.email,
      },
    });
  }, [data]);

  const save = useMutation({
    mutationFn: (body: InvoiceConfigDto) => api.patch<InvoiceConfigDto>('/settings/invoice', body),
    onSuccess: (next) => {
      qc.setQueryData(['settings-invoice'], next);
      toast('Billing & invoice settings saved.');
    },
    onError: (e: Error) => toast(e.message),
  });

  if (!form) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = <K extends keyof InvoiceConfigDto>(key: K, value: InvoiceConfigDto[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const setBank = (key: keyof InvoiceConfigDto['bank'], value: string) =>
    setForm((f) => (f ? { ...f, bank: { ...f.bank, [key]: value } } : f));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Billing & Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prefix, tax defaults, bank details, and PDF footer. Nothing here is hard-coded on
          invoices.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Invoice numbering</h2>
          <Field label="Invoice prefix" value={form.prefix} onChange={(v) => set('prefix', v)} />
          <p className="text-xs text-muted-foreground">
            Example: {form.prefix || 'MDH-INV'}-2026-0001
          </p>
          <Field
            label="Default due days"
            value={String(form.dueDays)}
            onChange={(v) => set('dueDays', Number(v) || 0)}
          />
          <Field
            label="Default payment terms"
            value={form.defaultPaymentTerms}
            onChange={(v) => set('defaultPaymentTerms', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Tax (optional)</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.taxEnabled}
              onChange={(e) => set('taxEnabled', e.target.checked)}
            />
            Tax enabled
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={form.taxType}
            onChange={(e) => set('taxType', e.target.value as InvoiceTaxType)}
          >
            <option value="NONE">None</option>
            <option value="CGST_SGST">CGST + SGST</option>
            <option value="IGST">IGST</option>
            <option value="OTHER">Other</option>
          </select>
          <Field
            label="Tax rate %"
            value={String(form.taxRate)}
            onChange={(v) => set('taxRate', Number(v) || 0)}
          />
          <Field
            label="Business PAN (shown on invoice if set)"
            value={form.pan}
            onChange={(v) => set('pan', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Business & bank details</h2>
          <p className="text-xs text-muted-foreground">
            Used only on invoices when enabled. Leave blank to hide the bank section. UPI QR is
            generated only if a UPI ID is set.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showBankDetails}
              onChange={(e) => set('showBankDetails', e.target.checked)}
            />
            Show bank details on invoice
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showUpiQr}
              onChange={(e) => set('showUpiQr', e.target.checked)}
            />
            Show UPI QR when a UPI ID is configured
          </label>
          <Field
            label="Account Name"
            value={form.bank.accountName}
            onChange={(v) => setBank('accountName', v)}
          />
          <Field
            label="Bank Name"
            value={form.bank.bankName}
            onChange={(v) => setBank('bankName', v)}
          />
          <Field
            label="Account Number"
            value={form.bank.accountNumber}
            onChange={(v) => setBank('accountNumber', v)}
          />
          <Field label="IFSC" value={form.bank.ifsc} onChange={(v) => setBank('ifsc', v)} />
          <Field label="Branch" value={form.bank.branch} onChange={(v) => setBank('branch', v)} />
          <Field label="UPI ID" value={form.bank.upiId} onChange={(v) => setBank('upiId', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">PDF copy</h2>
          <Field label="Invoice footer" value={form.footer} onChange={(v) => set('footer', v)} />
          <div>
            <Label>Terms & conditions</Label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-24"
              value={form.termsAndConditions}
              onChange={(e) => set('termsAndConditions', e.target.value)}
            />
          </div>
          <div>
            <Label>Payment instructions</Label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-20"
              value={form.paymentInstructions}
              onChange={(e) => set('paymentInstructions', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Invoice emails</h2>
          <p className="text-xs text-muted-foreground">
            Branded HTML invoices still attach the PDF. Leave sender email blank to use the server
            default (info@mercydosahouse.com). Automatic emails only send when the invoice has a
            customer email address.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.email.autoSend}
              onChange={(e) => set('email', { ...form.email, autoSend: e.target.checked })}
            />
            Enable automatic invoice emails (created, updated, payment, overdue, cancelled)
          </label>
          <Field
            label="Sender name"
            value={form.email.senderName}
            onChange={(v) => set('email', { ...form.email, senderName: v })}
          />
          <Field
            label="Sender email"
            value={form.email.senderEmail}
            onChange={(v) => set('email', { ...form.email, senderEmail: v })}
          />
          <Field
            label="Reply-to email"
            value={form.email.replyTo}
            onChange={(v) => set('email', { ...form.email, replyTo: v })}
          />
          <Field
            label="Business phone (email)"
            value={form.email.phone}
            onChange={(v) => set('email', { ...form.email, phone: v })}
          />
          <Field
            label="Business address (email)"
            value={form.email.address}
            onChange={(v) => set('email', { ...form.email, address: v })}
          />
          <Field
            label="Website"
            value={form.email.website}
            onChange={(v) => set('email', { ...form.email, website: v })}
          />
          <Field
            label="Logo URL (optional override)"
            value={form.email.logoUrl}
            onChange={(v) => set('email', { ...form.email, logoUrl: v })}
          />
          <Field
            label="Invoice email subject"
            value={form.email.subject}
            onChange={(v) => set('email', { ...form.email, subject: v })}
          />
          <p className="text-xs text-muted-foreground">
            Use {'{{invoice_number}}'} in the subject.
          </p>
          <Field
            label="Overdue reminder subject"
            value={form.email.overdueSubject}
            onChange={(v) => set('email', { ...form.email, overdueSubject: v })}
          />
          <div>
            <Label>Email footer</Label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-20"
              value={form.email.footer}
              onChange={(e) => set('email', { ...form.email, footer: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Button className="bg-[#14532D]" disabled={save.isPending} onClick={() => save.mutate(form)}>
        Save settings
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
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
