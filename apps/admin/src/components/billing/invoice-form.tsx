'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import { inr } from '@/lib/invoice-pdf';
import type {
  CreateInvoiceRequest,
  InvoiceConfigDto,
  InvoiceCustomerType,
  InvoiceDiscountType,
  InvoiceDto,
  InvoiceItemInput,
  InvoiceTaxType,
  PaginatedResult,
  ProductDto,
} from '@mdh/types';
import { INVOICE_CUSTOMER_TYPES, INVOICE_CUSTOMER_TYPE_LABELS } from '@mdh/types';

type Line = InvoiceItemInput & { key: string };

function emptyLine(): Line {
  return { key: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, notes: '' };
}

export function InvoiceForm({
  initial,
  mode,
}: {
  initial?: InvoiceDto | null;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const { data: cfg } = useQuery({
    queryKey: ['settings-invoice'],
    queryFn: () => api.get<InvoiceConfigDto>('/settings/invoice'),
  });

  const [customerType, setCustomerType] = useState<InvoiceCustomerType>(
    initial?.customerType ?? 'ORGANISATION',
  );
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '');
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [billingAddress, setBillingAddress] = useState(initial?.billingAddress ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState(initial?.deliveryAddress ?? '');
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [pan, setPan] = useState(initial?.pan ?? '');
  const [referenceNumber, setReferenceNumber] = useState(initial?.referenceNumber ?? '');
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [invoiceDate, setInvoiceDate] = useState(
    (initial?.invoiceDate || new Date().toISOString()).slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    (initial?.dueDate || new Date().toISOString()).slice(0, 10),
  );
  const [items, setItems] = useState<Line[]>(
    initial?.items?.length
      ? initial.items.map((i) => ({
          key: i.id,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes ?? '',
          productId: i.productId,
        }))
      : [emptyLine()],
  );
  const [discountType, setDiscountType] = useState<InvoiceDiscountType | ''>(
    initial?.discountType ?? '',
  );
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? 0);
  const [discountLabel, setDiscountLabel] = useState(
    initial?.discountLabel ?? 'Bulk Order Discount',
  );
  const [deliveryCharge, setDeliveryCharge] = useState(initial?.deliveryCharge ?? 0);
  const [packingCharge, setPackingCharge] = useState(initial?.packingCharge ?? 0);
  const [otherCharges, setOtherCharges] = useState(initial?.otherCharges ?? 0);
  const [otherChargesLabel, setOtherChargesLabel] = useState(
    initial?.otherChargesLabel ?? 'Other Charges',
  );
  const [taxEnabled, setTaxEnabled] = useState(initial?.taxEnabled ?? false);
  const [taxType, setTaxType] = useState<InvoiceTaxType>(initial?.taxType ?? 'NONE');
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 0);
  const [productSearch, setProductSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkName, setBulkName] = useState('');
  const [bulkQty, setBulkQty] = useState(100);
  const [bulkPrice, setBulkPrice] = useState(0);

  useEffect(() => {
    if (!cfg || initial) return;
    setPaymentTerms((v) => v || cfg.defaultPaymentTerms);
    setTaxEnabled(cfg.taxEnabled);
    setTaxType(cfg.taxType);
    setTaxRate(cfg.taxRate);
    if (cfg.dueDays) {
      const d = new Date();
      d.setDate(d.getDate() + cfg.dueDays);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }, [cfg, initial]);

  const { data: productPage } = useQuery({
    queryKey: ['invoice-products', productSearch],
    queryFn: () =>
      api.get<PaginatedResult<ProductDto>>(
        `/products?limit=8${productSearch.trim() ? `&search=${encodeURIComponent(productSearch.trim())}` : ''}`,
      ),
    enabled: productSearch.trim().length > 1,
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
      0,
    );
    let discountAmount = 0;
    if (discountType === 'PERCENTAGE')
      discountAmount = subtotal * (Math.min(100, Number(discountValue) || 0) / 100);
    if (discountType === 'FIXED') discountAmount = Math.min(subtotal, Number(discountValue) || 0);
    const taxable = Math.max(0, subtotal - discountAmount);
    const tax = taxEnabled && taxRate > 0 ? taxable * (Number(taxRate) / 100) : 0;
    const grand =
      taxable +
      Number(deliveryCharge || 0) +
      Number(packingCharge || 0) +
      Number(otherCharges || 0) +
      tax;
    return { subtotal, discountAmount, tax, grand };
  }, [
    items,
    discountType,
    discountValue,
    deliveryCharge,
    packingCharge,
    otherCharges,
    taxEnabled,
    taxRate,
  ]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: CreateInvoiceRequest = {
        customerType,
        customerName: customerName.trim(),
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || phone.trim() || null,
        email: email.trim() || null,
        billingAddress: billingAddress.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        paymentTerms: paymentTerms.trim() || null,
        notes: notes.trim() || null,
        invoiceDate,
        dueDate,
        items: items
          .filter((i) => i.description.trim() && Number(i.quantity) > 0)
          .map((i) => ({
            productId: i.productId,
            description: i.description.trim(),
            notes: i.notes?.trim() || null,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          })),
        discountType: discountType || null,
        discountValue: discountType ? Number(discountValue) : null,
        discountLabel: discountLabel.trim() || null,
        applyPromoDiscount: false,
        deliveryCharge: Number(deliveryCharge) || 0,
        packingCharge: Number(packingCharge) || 0,
        otherCharges: Number(otherCharges) || 0,
        otherChargesLabel: otherChargesLabel.trim() || null,
        taxEnabled,
        taxType: taxEnabled ? taxType : 'NONE',
        taxRate: taxEnabled ? Number(taxRate) : 0,
      };
      if (mode === 'edit' && initial) {
        return api.patch<InvoiceDto>(`/invoices/${initial.id}`, payload);
      }
      return api.post<InvoiceDto>('/invoices', payload);
    },
    onSuccess: (inv) => {
      toast(mode === 'edit' ? 'Invoice updated.' : 'Invoice created.');
      router.push(`/billing/${inv.id}?created=${mode === 'create' ? '1' : '0'}`);
    },
    onError: (e: Error) => toast(e.message),
  });

  function addProduct(p: ProductDto) {
    setItems((rows) => [
      ...rows.filter((r) => r.description.trim()),
      {
        key: crypto.randomUUID(),
        productId: p.id,
        description: p.name,
        quantity: 1,
        unitPrice: p.price,
        notes: '',
      },
    ]);
    setProductSearch('');
  }

  function addBulk() {
    if (!bulkName.trim() || bulkQty <= 0) return;
    setItems((rows) => [
      ...rows.filter((r) => r.description.trim()),
      {
        key: crypto.randomUUID(),
        description: bulkName.trim(),
        quantity: Number(bulkQty),
        unitPrice: Number(bulkPrice),
        notes: 'Bulk order',
      },
    ]);
    setBulkOpen(false);
    setBulkName('');
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-[#14532D]">Customer Details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Customer type</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as InvoiceCustomerType)}
              >
                {INVOICE_CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INVOICE_CUSTOMER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Customer / Organisation Name"
              value={customerName}
              onChange={setCustomerName}
              required
            />
            <Field label="Contact Person" value={contactPerson} onChange={setContactPerson} />
            <Field label="Phone Number" value={phone} onChange={setPhone} />
            <Field label="WhatsApp Number" value={whatsapp} onChange={setWhatsapp} />
            <Field label="Email Address" value={email} onChange={setEmail} />
            <Field label="GSTIN (optional)" value={gstin} onChange={setGstin} />
            <Field label="PAN (optional)" value={pan} onChange={setPan} />
            <div className="sm:col-span-2">
              <Label>Billing Address</Label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-20"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Delivery Address</Label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-20"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-[#14532D]">Invoice Information</h2>
          <p className="text-xs text-muted-foreground">
            Invoice numbers are assigned automatically as {cfg?.prefix || 'MDH-INV'}-YYYY-0001 when
            you save.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Invoice Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Field
              label="Order / Reference Number"
              value={referenceNumber}
              onChange={setReferenceNumber}
            />
            <Field label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-[#14532D]">Items</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkOpen((v) => !v)}
              >
                + Add Bulk Order Items
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#14532D]"
                onClick={() => setItems((r) => [...r, emptyLine()])}
              >
                <Plus className="w-4 h-4 mr-1" /> Add item
              </Button>
            </div>
          </div>
          {bulkOpen ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 grid sm:grid-cols-4 gap-2">
              <Input
                placeholder="Item name"
                value={bulkName}
                onChange={(e) => setBulkName(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                value={bulkQty}
                onChange={(e) => setBulkQty(Number(e.target.value))}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Unit price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(Number(e.target.value))}
              />
              <Button type="button" onClick={addBulk}>
                Add {bulkQty} × ₹{bulkPrice} = {inr(bulkQty * bulkPrice)}
              </Button>
            </div>
          ) : null}
          <div>
            <Label>Search menu to add</Label>
            <Input
              className="mt-1"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search dishes…"
            />
            {productPage?.data?.length ? (
              <div className="mt-2 border rounded-lg divide-y max-h-40 overflow-auto">
                {productPage.data.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#FFF8E8]"
                    onClick={() => addProduct(p)}
                  >
                    {p.name} · {inr(p.price)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Item</th>
                  <th className="py-2 w-24">Qty</th>
                  <th className="py-2 w-32">Unit Price</th>
                  <th className="py-2 w-32 text-right">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.key} className="border-t align-top">
                    <td className="py-2 pr-2">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          setItems((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, description: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Description"
                      />
                      <Input
                        className="mt-1"
                        value={row.notes ?? ''}
                        onChange={(e) =>
                          setItems((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, notes: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Notes (optional)"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={row.quantity}
                        onChange={(e) =>
                          setItems((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, quantity: Number(e.target.value) } : r,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) =>
                          setItems((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, unitPrice: Number(e.target.value) } : r,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {inr(Number(row.quantity || 0) * Number(row.unitPrice || 0))}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() =>
                          setItems((rows) =>
                            rows.length === 1
                              ? [emptyLine()]
                              : rows.filter((r) => r.key !== row.key),
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold text-[#14532D]">Discount & charges</h2>
            <div>
              <Label>Discount type</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as InvoiceDiscountType | '')}
              >
                <option value="">None</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </div>
            {discountType ? (
              <>
                <Field
                  label={discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount'}
                  value={String(discountValue)}
                  onChange={(v) => setDiscountValue(Number(v))}
                />
                <Field label="Discount label" value={discountLabel} onChange={setDiscountLabel} />
              </>
            ) : null}
            <Field
              label="Delivery charges"
              value={String(deliveryCharge)}
              onChange={(v) => setDeliveryCharge(Number(v))}
            />
            <Field
              label="Packing charges"
              value={String(packingCharge)}
              onChange={(v) => setPackingCharge(Number(v))}
            />
            <Field
              label="Other charges"
              value={String(otherCharges)}
              onChange={(v) => setOtherCharges(Number(v))}
            />
            <Field
              label="Other charges label"
              value={otherChargesLabel}
              onChange={setOtherChargesLabel}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
              />
              Tax enabled
            </label>
            {taxEnabled ? (
              <>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value as InvoiceTaxType)}
                >
                  <option value="CGST_SGST">CGST + SGST</option>
                  <option value="IGST">IGST</option>
                  <option value="OTHER">Other</option>
                </select>
                <Field
                  label="Tax rate %"
                  value={String(taxRate)}
                  onChange={(v) => setTaxRate(Number(v))}
                />
              </>
            ) : null}
          </div>
          <div className="rounded-xl bg-[#FFF8E8] p-4 space-y-2 text-sm">
            <Row label="Subtotal" value={inr(totals.subtotal)} />
            {totals.discountAmount > 0 ? (
              <Row label={discountLabel || 'Discount'} value={`-${inr(totals.discountAmount)}`} />
            ) : null}
            <Row label="Delivery" value={inr(Number(deliveryCharge || 0))} />
            <Row label="Packing" value={inr(Number(packingCharge || 0))} />
            {Number(otherCharges) > 0 ? (
              <Row label={otherChargesLabel || 'Other'} value={inr(Number(otherCharges))} />
            ) : null}
            {taxEnabled && totals.tax > 0 ? <Row label="Tax" value={inr(totals.tax)} /> : null}
            <div className="border-t border-[#14532D]/20 pt-2 flex justify-between font-bold text-[#14532D]">
              <span>Grand Total</span>
              <span>{inr(totals.grand)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label>Notes</Label>
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-20"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="bg-[#14532D]" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : mode === 'edit' ? 'Save invoice' : 'Create invoice'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/billing')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
