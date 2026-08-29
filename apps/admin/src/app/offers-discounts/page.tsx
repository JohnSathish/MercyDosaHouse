'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { Check, Copy, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

type Discount = {
  id: string;
  name: string | null;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  startTime: string | null;
  endTime: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerUsageLimit: number | null;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
  customerIds: string[];
};

type Option = { id: string; name: string };
type Draft = Omit<
  Discount,
  | 'id'
  | 'usageCount'
  | 'code'
  | 'name'
  | 'startsAt'
  | 'endsAt'
  | 'productIds'
  | 'categoryIds'
  | 'customerIds'
> & {
  name: string;
  code: string;
  startsAt: string;
  endsAt: string;
  productIds: string[];
  categoryIds: string[];
  customerIds: string[];
};

const EMPTY: Draft = {
  name: '',
  code: '',
  type: 'PERCENTAGE',
  value: 0,
  minOrderAmount: 0,
  maxDiscount: null,
  startsAt: '',
  endsAt: '',
  startTime: '',
  endTime: '',
  usageLimit: null,
  perCustomerUsageLimit: null,
  isActive: true,
  productIds: [],
  categoryIds: [],
  customerIds: [],
};

function rows<T>(value: T[] | { data?: T[] } | undefined): T[] {
  return Array.isArray(value) ? value : (value?.data ?? []);
}

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Always';
}

export default function OffersDiscountsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => api.get<Discount[]>('/coupons'),
  });
  const { data: productResponse } = useQuery({
    queryKey: ['discount-products'],
    queryFn: () => api.get<{ data: Option[] }>('/products?limit=500'),
  });
  const { data: categoriesResponse } = useQuery({
    queryKey: ['discount-categories'],
    queryFn: () => api.get<Option[]>('/categories'),
  });
  const { data: customerResponse } = useQuery({
    queryKey: ['discount-customers'],
    queryFn: () => api.get<{ data: Option[] }>('/customers?limit=500'),
  });

  const products = rows(productResponse);
  const categories = rows(categoriesResponse);
  const customers = rows(customerResponse);

  const save = useMutation({
    mutationFn: () =>
      editingId ? api.patch(`/coupons/${editingId}`, draft) : api.post('/coupons', draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setFormOpen(false);
      setEditingId(null);
      setDraft(EMPTY);
    },
  });
  const toggle = useMutation({
    mutationFn: (discount: Discount) =>
      api.patch(`/coupons/${discount.id}`, { isActive: !discount.isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-discounts'] }),
  });
  const duplicate = useMutation({
    mutationFn: (id: string) => api.post(`/coupons/${id}/duplicate`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-discounts'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-discounts'] }),
  });

  const sortedDiscounts = useMemo(
    () => [...discounts].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    [discounts],
  );

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY);
    setFormOpen(true);
  }

  function openEdit(discount: Discount) {
    setEditingId(discount.id);
    setDraft({
      ...discount,
      name: discount.name ?? '',
      code: discount.code.startsWith('AUTO-') ? '' : discount.code,
      startsAt: discount.startsAt?.slice(0, 16) ?? '',
      endsAt: discount.endsAt?.slice(0, 16) ?? '',
      startTime: discount.startTime ?? '',
      endTime: discount.endTime ?? '',
    });
    setFormOpen(true);
  }

  function setNumber(
    key: 'value' | 'minOrderAmount' | 'maxDiscount' | 'usageLimit' | 'perCustomerUsageLimit',
    value: string,
  ) {
    setDraft((current) => ({ ...current, [key]: value === '' ? null : Number(value) }));
  }

  function setMulti(
    key: 'productIds' | 'categoryIds' | 'customerIds',
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: Array.from(event.target.selectedOptions, (option) => option.value),
    }));
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C17A08]">Marketing</p>
          <h1 className="text-2xl font-bold text-[#14532D]">Offers & Discounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create server-validated offers for products, categories, and customers.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#14532D]">
          <Plus className="mr-2 h-4 w-4" /> Create Discount
        </Button>
      </div>

      {formOpen ? (
        <Card className="border-[#14532D]/15 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14532D]">
                {editingId ? 'Edit discount' : 'Create discount'}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Discount Name">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Sunday Biryani Offer"
                />
              </Field>
              <Field label="Discount Code (optional)">
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                  placeholder="SUNDAY10"
                />
              </Field>
              <Field label="Discount Type">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft['type'] })}
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed Amount</option>
                </select>
              </Field>
              <Field
                label={draft.type === 'PERCENTAGE' ? 'Discount Value (%)' : 'Discount Value (₹)'}
              >
                <Input
                  type="number"
                  min="0"
                  value={draft.value}
                  onChange={(e) => setNumber('value', e.target.value)}
                />
              </Field>
              <Field label="Minimum Order Value (₹)">
                <Input
                  type="number"
                  min="0"
                  value={draft.minOrderAmount}
                  onChange={(e) => setNumber('minOrderAmount', e.target.value)}
                />
              </Field>
              <Field label="Maximum Discount (₹, optional)">
                <Input
                  type="number"
                  min="0"
                  value={draft.maxDiscount ?? ''}
                  onChange={(e) => setNumber('maxDiscount', e.target.value)}
                />
              </Field>
              <Field label="Start Date">
                <Input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                />
              </Field>
              <Field label="End Date">
                <Input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                />
              </Field>
              <Field label="Start Time (optional)">
                <Input
                  type="time"
                  value={draft.startTime ?? ''}
                  onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                />
              </Field>
              <Field label="End Time (optional)">
                <Input
                  type="time"
                  value={draft.endTime ?? ''}
                  onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                />
              </Field>
              <Field label="Usage Limit (optional)">
                <Input
                  type="number"
                  min="1"
                  value={draft.usageLimit ?? ''}
                  onChange={(e) => setNumber('usageLimit', e.target.value)}
                />
              </Field>
              <Field label="Per Customer Limit (optional)">
                <Input
                  type="number"
                  min="1"
                  value={draft.perCustomerUsageLimit ?? ''}
                  onChange={(e) => setNumber('perCustomerUsageLimit', e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MultiField
                label="Applicable Products"
                options={products}
                value={draft.productIds}
                onChange={(e) => setMulti('productIds', e)}
              />
              <MultiField
                label="Applicable Categories"
                options={categories}
                value={draft.categoryIds}
                onChange={(e) => setMulti('categoryIds', e)}
              />
              <MultiField
                label="Applicable Customers"
                options={customers}
                value={draft.customerIds}
                onChange={(e) => setMulti('customerIds', e)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              />
              Active immediately
            </label>
            <div className="flex gap-2">
              <Button
                disabled={!draft.name.trim() || draft.value <= 0 || save.isPending}
                onClick={() => save.mutate()}
              >
                <Check className="mr-2 h-4 w-4" /> {save.isPending ? 'Saving…' : 'Save Discount'}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#FFF8E8] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-4">Discount</th>
                <th className="p-4">Type</th>
                <th className="p-4">Value</th>
                <th className="p-4">Applicable To</th>
                <th className="p-4">Validity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading discounts…
                  </td>
                </tr>
              ) : sortedDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No discounts created yet.
                  </td>
                </tr>
              ) : (
                sortedDiscounts.map((discount) => (
                  <tr key={discount.id} className="border-t">
                    <td className="p-4">
                      <p className="font-semibold text-[#14532D]">
                        {discount.name ?? discount.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {discount.code.startsWith('AUTO-') ? 'Automatic offer' : discount.code}
                      </p>
                    </td>
                    <td className="p-4">
                      {discount.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                    </td>
                    <td className="p-4 font-semibold">
                      {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `₹${discount.value}`}
                    </td>
                    <td className="p-4">
                      {discount.productIds.length ||
                      discount.categoryIds.length ||
                      discount.customerIds.length
                        ? `${discount.productIds.length} products · ${discount.categoryIds.length} categories · ${discount.customerIds.length} customers`
                        : 'All eligible orders'}
                    </td>
                    <td className="p-4">
                      {dateLabel(discount.startsAt)} – {dateLabel(discount.endsAt)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${discount.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {discount.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Edit" onClick={() => openEdit(discount)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={discount.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => toggle.mutate(discount)}
                        >
                          <Power className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Duplicate" onClick={() => duplicate.mutate(discount.id)}>
                          <Copy className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label="Delete"
                          onClick={() =>
                            window.confirm('Delete this discount permanently?') &&
                            remove.mutate(discount.id)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </IconButton>
                      </div>
                    </td>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MultiField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <Field label={`${label} (empty = all)`}>
      <select
        multiple
        value={value}
        onChange={onChange}
        className="min-h-28 w-full rounded-md border bg-background p-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-2 hover:bg-gray-100"
    >
      {children}
    </button>
  );
}
