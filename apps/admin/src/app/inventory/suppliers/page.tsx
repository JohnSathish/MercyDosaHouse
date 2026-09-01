'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge, Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Supplier = {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  paymentTerms?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  notes?: string | null;
  isActive: boolean;
  totalPurchases?: number;
  _count?: { items: number; purchaseOrders: number };
  purchaseOrders?: Array<{
    id: string;
    poNumber: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
};

const empty = {
  name: '',
  contactPerson: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  gstNumber: '',
  paymentTerms: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  notes: '',
};

const inputClass = 'w-full mt-1 h-10 rounded-lg border px-3 text-sm';

export default function SuppliersPage() {
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () => api.get<Supplier[]>('/inventory/suppliers?includeInactive=true'),
  });

  const { data: detail } = useQuery({
    queryKey: ['inventory-supplier', viewId],
    queryFn: () => api.get<Supplier>(`/inventory/suppliers/${viewId}`),
    enabled: Boolean(viewId),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.patch(`/inventory/suppliers/${editing.id}`, form)
        : api.post('/inventory/suppliers', form),
    onSuccess: () => {
      toast(editing ? 'Supplier updated' : 'Supplier added');
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
      setOpen(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Save failed'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.post(`/inventory/suppliers/${id}/deactivate`),
    onSuccess: () => {
      toast('Supplier deactivated');
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
    },
  });

  const startAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? '',
      phone: s.phone ?? '',
      whatsapp: s.whatsapp ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      gstNumber: s.gstNumber ?? '',
      paymentTerms: s.paymentTerms ?? '',
      bankName: s.bankName ?? '',
      accountNumber: s.accountNumber ?? '',
      ifsc: s.ifsc ?? '',
      notes: s.notes ?? '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button className="bg-[#14532D] gap-1.5 min-h-[44px]" onClick={startAdd}>
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : suppliers.length === 0 ? (
        <p className="text-muted-foreground">No suppliers added yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{s.name}</h3>
                <Badge variant="outline">{s.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              {s.contactPerson ? <p className="text-sm">{s.contactPerson}</p> : null}
              {s.phone ? <p className="text-sm text-muted-foreground">{s.phone}</p> : null}
              {s.whatsapp ? (
                <p className="text-sm text-muted-foreground">WhatsApp {s.whatsapp}</p>
              ) : null}
              {s.email ? <p className="text-sm text-muted-foreground">{s.email}</p> : null}
              {s.gstNumber ? (
                <p className="text-xs text-muted-foreground mt-1">GSTIN: {s.gstNumber}</p>
              ) : null}
              <p className="text-sm font-semibold mt-2 text-[#14532D]">
                Total purchases: {formatCurrency(Number(s.totalPurchases ?? 0))}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setViewId(s.id)}>
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                  Edit
                </Button>
                {s.isActive ? (
                  <Button size="sm" variant="outline" onClick={() => deactivate.mutate(s.id)}>
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ['name', 'Supplier Name'],
                ['contactPerson', 'Contact Person'],
                ['phone', 'Phone'],
                ['whatsapp', 'WhatsApp'],
                ['email', 'Email'],
                ['gstNumber', 'GSTIN'],
                ['paymentTerms', 'Payment Terms'],
                ['bankName', 'Bank Name'],
                ['accountNumber', 'Account Number'],
                ['ifsc', 'IFSC'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <input
                  className={inputClass}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="text-sm font-medium sm:col-span-2">
              Address
              <textarea
                className="w-full mt-1 rounded-lg border px-3 py-2 text-sm min-h-[64px]"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Notes
              <textarea
                className="w-full mt-1 rounded-lg border px-3 py-2 text-sm min-h-[64px]"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              className="bg-[#14532D]"
              disabled={!form.name || save.isPending}
              onClick={() => save.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewId)} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? 'Supplier'}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <p>Total purchases: {formatCurrency(Number(detail.totalPurchases ?? 0))}</p>
              <h4 className="font-semibold">Purchase history</h4>
              {!detail.purchaseOrders?.length ? (
                <p className="text-muted-foreground">No purchase orders yet</p>
              ) : (
                detail.purchaseOrders.map((p) => (
                  <div key={p.id} className="flex justify-between border-b py-1.5">
                    <span className="font-mono">{p.poNumber}</span>
                    <span>{formatCurrency(Number(p.total))}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
