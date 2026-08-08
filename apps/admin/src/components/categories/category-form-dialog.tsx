'use client';

import { useEffect, useState } from 'react';
import type { AdminCategoryDto, CategoryStatus } from '@mdh/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@mdh/ui';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AdminCategoryDto | null;
  onSave: (data: Record<string, unknown>) => void;
  saving?: boolean;
}

const STATUSES: CategoryStatus[] = ['DRAFT', 'PUBLISHED', 'HIDDEN', 'INACTIVE', 'SEASONAL'];

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSave,
  saving,
}: CategoryFormDialogProps) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '🍽',
    status: 'DRAFT' as CategoryStatus,
    isFeatured: false,
    isPopular: false,
    sortOrder: 0,
    seoTitle: '',
    seoDescription: '',
    showOnWebsite: true,
    showOnApp: true,
    allowOrdering: true,
  });

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        slug: category.slug,
        description: category.description ?? '',
        icon: category.icon ?? '🍽',
        status: category.status,
        isFeatured: category.isFeatured,
        isPopular: category.isPopular,
        sortOrder: category.sortOrder,
        seoTitle: category.seoTitle ?? '',
        seoDescription: category.seoDescription ?? '',
        showOnWebsite: category.showOnWebsite,
        showOnApp: category.showInMobileApp,
        allowOrdering: category.allowOrdering,
      });
    } else {
      setForm({
        name: '',
        slug: '',
        description: '',
        icon: '🍽',
        status: 'DRAFT',
        isFeatured: false,
        isPopular: false,
        sortOrder: 0,
        seoTitle: '',
        seoDescription: '',
        showOnWebsite: true,
        showOnApp: true,
        allowOrdering: true,
      });
    }
  }, [category, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      showInMobileApp: form.showOnApp,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Category Name">
              <input
                className="w-full px-3 py-2 rounded-lg border text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Slug">
              <input
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </Field>
            <Field label="Icon">
              <input
                className="w-full px-3 py-2 rounded-lg border text-sm text-2xl"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className="w-full px-3 py-2 rounded-lg border text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CategoryStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className="w-full px-3 py-2 rounded-lg border text-sm min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="SEO Title">
              <input
                className="w-full px-3 py-2 rounded-lg border text-sm"
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              />
            </Field>
            <Field label="Display Order">
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <Field label="SEO Description">
            <textarea
              className="w-full px-3 py-2 rounded-lg border text-sm"
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
            />
          </Field>

          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            {[
              ['isFeatured', 'Featured'],
              ['isPopular', 'Popular'],
              ['showOnWebsite', 'Show on Website'],
              ['showOnApp', 'Show on App'],
              ['allowOrdering', 'Allow Ordering'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#14532D]" disabled={saving}>
              {saving ? 'Saving…' : category ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
