'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@mdh/ui';
import { InventoryUnit, type InventoryItemDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const UNITS = Object.values(InventoryUnit);

const inputClass = 'w-full mt-1 h-10 rounded-lg border px-3 text-sm';

export function IngredientFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItemDto | null;
}) {
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/inventory/categories'),
    enabled: open,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/inventory/suppliers'),
    enabled: open,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/inventory/locations'),
    enabled: open,
  });

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    unit: InventoryUnit.KG,
    customUnit: '',
    currentStock: '',
    minStock: '',
    costPrice: '',
    supplierId: '',
    locationId: '',
    lotNumber: '',
    expiryDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: item?.name ?? '',
      sku: item?.sku ?? '',
      barcode: item?.barcode ?? '',
      categoryId: item?.categoryId ?? '',
      unit: (item?.unit as InventoryUnit) ?? InventoryUnit.KG,
      customUnit: item?.customUnit ?? '',
      currentStock: item ? String(item.currentStock) : '',
      minStock: item ? String(item.minStock) : '',
      costPrice: item ? String(item.costPrice) : '',
      supplierId: item?.supplierId ?? '',
      locationId: item?.locationId ?? '',
      lotNumber: item?.lotNumber ?? '',
      expiryDate: item?.expiryDate ? item.expiryDate.slice(0, 10) : '',
      notes: item?.notes ?? '',
    });
  }, [open, item]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        categoryId: form.categoryId,
        unit: form.unit,
        customUnit: form.unit === InventoryUnit.CUSTOM ? form.customUnit : undefined,
        minStock: Number(form.minStock || 0),
        costPrice: Number(form.costPrice || 0),
        supplierId: form.supplierId || undefined,
        locationId: form.locationId || undefined,
        lotNumber: form.lotNumber || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
        expiryTracking: Boolean(form.expiryDate),
        ...(item ? {} : { currentStock: Number(form.currentStock || 0) }),
      };
      if (item) return api.patch(`/inventory/items/${item.id}`, payload);
      return api.post('/inventory/items', payload);
    },
    onSuccess: () => {
      toast(item ? 'Ingredient updated' : 'Ingredient added');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Save failed'),
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ingredient Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="SKU / Item Code">
            <input
              className={inputClass}
              value={form.sku}
              onChange={(e) => set('sku', e.target.value)}
            />
          </Field>
          <Field label="Barcode">
            <input
              className={inputClass}
              value={form.barcode}
              onChange={(e) => set('barcode', e.target.value)}
            />
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit">
            <select
              className={inputClass}
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          {form.unit === InventoryUnit.CUSTOM ? (
            <Field label="Custom unit">
              <input
                className={inputClass}
                value={form.customUnit}
                onChange={(e) => set('customUnit', e.target.value)}
              />
            </Field>
          ) : null}
          {!item ? (
            <Field label="Opening Stock">
              <input
                type="number"
                className={inputClass}
                value={form.currentStock}
                onChange={(e) => set('currentStock', e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Minimum Stock Level">
            <input
              type="number"
              className={inputClass}
              value={form.minStock}
              onChange={(e) => set('minStock', e.target.value)}
            />
          </Field>
          <Field label="Cost Per Unit">
            <input
              type="number"
              className={inputClass}
              value={form.costPrice}
              onChange={(e) => set('costPrice', e.target.value)}
            />
          </Field>
          <Field label="Preferred Supplier">
            <select
              className={inputClass}
              value={form.supplierId}
              onChange={(e) => set('supplierId', e.target.value)}
            >
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Storage Location">
            <select
              className={inputClass}
              value={form.locationId}
              onChange={(e) => set('locationId', e.target.value)}
            >
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batch / Lot Number">
            <input
              className={inputClass}
              value={form.lotNumber}
              onChange={(e) => set('lotNumber', e.target.value)}
            />
          </Field>
          <Field label="Expiry Date">
            <input
              type="date"
              className={inputClass}
              value={form.expiryDate}
              onChange={(e) => set('expiryDate', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className="w-full mt-1 rounded-lg border px-3 py-2 text-sm min-h-[72px]"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#14532D]"
            disabled={!form.name || !form.sku || !form.categoryId || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium block">
      {label}
      {children}
    </label>
  );
}
