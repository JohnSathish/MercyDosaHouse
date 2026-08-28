'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Select, Textarea } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { BusinessSettingsDto, ProductDto } from '@mdh/types';
import { FoodType, SpiceLevel } from '@mdh/types';

const FLAG_KEYS = [
  ['isPopular', 'Popular'],
  ['isBestseller', 'Bestseller'],
  ['isFeatured', 'Featured'],
  ['isOnOffer', 'Offer'],
  ['isPreOrder', 'Pre-Order'],
  ['isComingSoon', 'Coming Soon'],
] as const;

type MenuProduct = ProductDto & {
  isAvailable?: boolean;
};

type ItemDraft = {
  name: string;
  description: string;
  price: string;
  packingCharge: string;
  categoryId: string;
  foodType: string;
  spiceLevel: string;
  prepTimeMinutes: string;
};

const emptyForm = {
  name: '',
  slug: '',
  price: '',
  packingCharge: '20',
  categoryId: '',
  description: '',
  foodType: FoodType.VEG as string,
};

function isProductAvailable(p: MenuProduct) {
  return p.isAvailable !== false;
}

function toItemDraft(p: MenuProduct): ItemDraft {
  return {
    name: p.name,
    description: p.description ?? '',
    price: String(p.price ?? ''),
    packingCharge: String(p.packingCharge ?? 20),
    categoryId: p.categoryId ?? p.category?.id ?? '',
    foodType: p.foodType ?? FoodType.VEG,
    spiceLevel: p.spiceLevel ?? SpiceLevel.MILD,
    prepTimeMinutes: String(p.prepTimeMinutes ?? 15),
  };
}

function parseMoney(value: string) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function MenuManagementPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [form, setForm] = useState(emptyForm);
  const [charges, setCharges] = useState({
    deliveryCharge: '',
    packingCharge: '',
    freeDeliveryLimit: '',
    minOrderAmount: '',
  });

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get<{ data: MenuProduct[] }>('/products?limit=200'),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/categories'),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-business-settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  useEffect(() => {
    if (!settings) return;
    setCharges({
      deliveryCharge: String(settings.deliveryCharge ?? 30),
      packingCharge: String(settings.packingCharge ?? 20),
      freeDeliveryLimit: String(settings.freeDeliveryLimit ?? 299),
      minOrderAmount: String(settings.minOrderAmount ?? 0),
    });
  }, [settings]);

  const createProduct = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/products', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const patchProduct = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/products/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast('Item deleted from the menu.');
    },
    onError: (err: Error) => toast(err.message || 'Could not delete this item.'),
  });

  const saveCharges = useMutation({
    mutationFn: (body: Record<string, number>) => api.patch('/settings/business', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-business-settings'] }),
  });

  function openEditor(p: MenuProduct) {
    setEditingId(p.id);
    setDrafts((prev) => ({ ...prev, [p.id]: prev[p.id] ?? toItemDraft(p) }));
  }

  function updateDraft(id: string, patch: Partial<ItemDraft>) {
    setDrafts((prev) => {
      const current = prev[id] ?? toItemDraft(products?.data.find((item) => item.id === id)!);
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  function saveItem(p: MenuProduct) {
    const draft = drafts[p.id] ?? toItemDraft(p);
    const price = parseMoney(draft.price);
    const packingCharge = parseMoney(draft.packingCharge);
    if (!draft.name.trim() || price === null || packingCharge === null) return;
    patchProduct.mutate({
      id: p.id,
      body: {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price,
        packingCharge,
        categoryId: draft.categoryId || p.categoryId,
        foodType: draft.foodType,
        spiceLevel: draft.spiceLevel,
        prepTimeMinutes: parseInt(draft.prepTimeMinutes, 10) || 15,
      },
    });
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit item name, price, packing charge, and availability here. Delivery charge is
            store-wide and applies to home delivery orders.
          </p>
        </div>
        <Button className="w-full sm:w-auto min-h-[44px]" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Order charges</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Delivery and minimum order apply to every delivery order. Packing on this row is the
              default for new items; each dish can still have its own packing charge below.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Delivery charge (₹)</Label>
              <Input
                type="number"
                min={0}
                value={charges.deliveryCharge}
                onChange={(e) => setCharges({ ...charges, deliveryCharge: e.target.value })}
              />
            </div>
            <div>
              <Label>Free delivery above (₹)</Label>
              <Input
                type="number"
                min={0}
                value={charges.freeDeliveryLimit}
                onChange={(e) => setCharges({ ...charges, freeDeliveryLimit: e.target.value })}
              />
            </div>
            <div>
              <Label>Minimum order (₹)</Label>
              <Input
                type="number"
                min={0}
                value={charges.minOrderAmount}
                onChange={(e) => setCharges({ ...charges, minOrderAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Default packing (₹)</Label>
              <Input
                type="number"
                min={0}
                value={charges.packingCharge}
                onChange={(e) => setCharges({ ...charges, packingCharge: e.target.value })}
              />
            </div>
          </div>
          <Button
            onClick={() => {
              const deliveryCharge = parseMoney(charges.deliveryCharge);
              const packingCharge = parseMoney(charges.packingCharge);
              const freeDeliveryLimit = parseMoney(charges.freeDeliveryLimit);
              const minOrderAmount = parseMoney(charges.minOrderAmount);
              if (
                deliveryCharge === null ||
                packingCharge === null ||
                freeDeliveryLimit === null ||
                minOrderAmount === null
              ) {
                return;
              }
              saveCharges.mutate({
                deliveryCharge,
                packingCharge,
                freeDeliveryLimit,
                minOrderAmount,
              });
            }}
            disabled={saveCharges.isPending}
          >
            {saveCharges.isPending ? 'Saving…' : saveCharges.isSuccess ? 'Saved' : 'Save charges'}
          </Button>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">New product</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from name if empty"
                />
              </div>
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Packing charge (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.packingCharge}
                  onChange={(e) => setForm({ ...form, packingCharge: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Food type</Label>
                <Select
                  value={form.foodType}
                  onChange={(e) => setForm({ ...form, foodType: e.target.value })}
                >
                  <option value={FoodType.VEG}>Veg</option>
                  <option value={FoodType.NON_VEG}>Non veg</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={() =>
                createProduct.mutate({
                  name: form.name.trim(),
                  slug: form.slug.trim() || undefined,
                  description: form.description.trim() || undefined,
                  price: parseFloat(form.price),
                  packingCharge: parseFloat(form.packingCharge) || 20,
                  categoryId: form.categoryId,
                  foodType: form.foodType,
                  spiceLevel: SpiceLevel.MILD,
                  prepTimeMinutes: 15,
                })
              }
              disabled={
                createProduct.isPending || !form.name.trim() || !form.price || !form.categoryId
              }
            >
              {createProduct.isPending ? 'Saving…' : 'Save product'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {products?.data.map((p) => {
          const available = isProductAvailable(p);
          const draft = drafts[p.id] ?? toItemDraft(p);
          const isEditing = editingId === p.id;
          return (
            <Card key={p.id}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(p.price)} — {p.category?.name}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 max-w-lg">
                      <div>
                        <Label className="text-xs">Price ₹</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 text-sm"
                          value={draft.price}
                          onChange={(e) => updateDraft(p.id, { price: e.target.value })}
                          onFocus={() => openEditor(p)}
                          onBlur={(e) => {
                            const val = parseMoney(e.target.value);
                            if (val !== null && val !== p.price) {
                              patchProduct.mutate({ id: p.id, body: { price: val } });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Packing ₹</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 text-sm"
                          value={draft.packingCharge}
                          onChange={(e) => updateDraft(p.id, { packingCharge: e.target.value })}
                          onFocus={() => openEditor(p)}
                          onBlur={(e) => {
                            const val = parseMoney(e.target.value);
                            if (val !== null && val !== (p.packingCharge ?? 20)) {
                              patchProduct.mutate({ id: p.id, body: { packingCharge: val } });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto min-h-[44px]"
                      onClick={() => (isEditing ? setEditingId(null) : openEditor(p))}
                    >
                      {isEditing ? 'Close' : 'Edit details'}
                    </Button>
                    <Button
                      size="sm"
                      variant={available ? 'outline' : 'secondary'}
                      className="w-full sm:w-auto min-h-[44px]"
                      onClick={() =>
                        patchProduct.mutate({
                          id: p.id,
                          body: { isAvailable: !available },
                        })
                      }
                    >
                      {available ? 'Available' : 'Unavailable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto min-h-[44px] text-red-600 border-red-200 hover:bg-red-50"
                      disabled={deleteProduct.isPending}
                      onClick={() => {
                        const ok = window.confirm(
                          `Delete "${p.name}" from the menu? Past orders will still keep the item name.`,
                        );
                        if (ok) deleteProduct.mutate(p.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={draft.name}
                          onChange={(e) => updateDraft(p.id, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={draft.categoryId}
                          onChange={(e) => updateDraft(p.id, { categoryId: e.target.value })}
                        >
                          {categories?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Food type</Label>
                        <Select
                          value={draft.foodType}
                          onChange={(e) => updateDraft(p.id, { foodType: e.target.value })}
                        >
                          <option value={FoodType.VEG}>Veg</option>
                          <option value={FoodType.NON_VEG}>Non veg</option>
                        </Select>
                      </div>
                      <div>
                        <Label>Spice</Label>
                        <Select
                          value={draft.spiceLevel}
                          onChange={(e) => updateDraft(p.id, { spiceLevel: e.target.value })}
                        >
                          <option value={SpiceLevel.MILD}>Mild</option>
                          <option value={SpiceLevel.MEDIUM}>Medium</option>
                          <option value={SpiceLevel.HOT}>Hot</option>
                          <option value="EXTRA_HOT">Extra hot</option>
                        </Select>
                      </div>
                      <div>
                        <Label>Prep time (minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={draft.prepTimeMinutes}
                          onChange={(e) => updateDraft(p.id, { prepTimeMinutes: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={draft.description}
                          onChange={(e) => updateDraft(p.id, { description: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => saveItem(p)}
                      disabled={patchProduct.isPending}
                      className="min-h-[44px]"
                    >
                      {patchProduct.isPending ? 'Saving…' : 'Save item'}
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {FLAG_KEYS.map(([key, label]) => {
                    const on = !!(p as MenuProduct & Record<string, boolean>)[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          patchProduct.mutate({
                            id: p.id,
                            body: { [key]: !on },
                          })
                        }
                        className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                          on
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-white text-muted-foreground border-border hover:border-[#14532D]/40'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
