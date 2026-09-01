'use client';

import { Suspense, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Badge, Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { InventoryItemDto } from '@mdh/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Po = {
  id: string;
  poNumber: string;
  status: string;
  total: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  deliveryCharge?: number;
  otherCharges?: number;
  notes?: string | null;
  paymentTerms?: string | null;
  supplierRef?: string | null;
  expectedDeliveryDate?: string | null;
  orderDate?: string;
  supplier: {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    paymentTerms?: string | null;
  };
  items: Array<{
    itemId: string;
    quantity: number;
    receivedQty: number;
    rate: number;
    tax: number;
    total: number;
    item: { name: string; unit: string; costPrice: number };
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Ordered',
  APPROVED: 'Ordered',
  ORDERED: 'Ordered',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CLOSED: 'Received',
  CANCELLED: 'Cancelled',
};

function normalizeStatus(status: string) {
  if (status === 'SENT' || status === 'APPROVED') return 'ORDERED';
  if (status === 'CLOSED') return 'RECEIVED';
  return status;
}

const inputClass = 'w-full mt-1 h-10 rounded-lg border px-3 text-sm';

function PurchaseOrdersPageInner() {
  const searchParams = useSearchParams();
  const preItemId = searchParams.get('itemId') ?? '';
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [createOpen, setCreateOpen] = useState(Boolean(preItemId));
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get<Po[]>('/inventory/purchase-orders'),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          name: string;
          contactPerson?: string;
          phone?: string;
          paymentTerms?: string;
        }>
      >('/inventory/suppliers'),
  });
  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get<InventoryItemDto[]>('/inventory/items'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/inventory/purchase-orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast('PO status updated');
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Status change failed'),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => api.post(`/inventory/purchase-orders/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast('Purchase order duplicated');
    },
  });

  const downloadPdf = async (id: string, poNumber: string) => {
    const blob = await api.getBlob(`/inventory/purchase-orders/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${poNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = async (id: string) => {
    const blob = await api.getBlob(`/inventory/purchase-orders/${id}/pdf?download=0`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const sharePdf = async (id: string, poNumber: string) => {
    const blob = await api.getBlob(`/inventory/purchase-orders/${id}/pdf`);
    const file = new File([blob], `${poNumber}.pdf`, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: poNumber });
      return;
    }
    await downloadPdf(id, poNumber);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Button
          className="bg-[#14532D] gap-1.5 min-h-[44px] text-base px-5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create Purchase Order
        </Button>
      </div>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground">
          No purchase orders yet. Create one from the button above.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((po) => {
            const status = normalizeStatus(String(po.status));
            return (
              <div
                key={po.id}
                className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm"
              >
                <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="font-mono font-bold text-lg">{po.poNumber}</p>
                    <p className="text-sm text-muted-foreground">{po.supplier?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(Number(po.total))}</p>
                    <Badge className="mt-1">{STATUS_LABEL[status] ?? status}</Badge>
                  </div>
                </div>
                <ul className="text-sm space-y-1 mb-3">
                  {po.items?.map((i, idx) => (
                    <li key={idx} className="flex justify-between text-muted-foreground">
                      <span>
                        {i.item?.name} · ordered {Number(i.quantity)} {i.item?.unit} · received{' '}
                        {Number(i.receivedQty)} {i.item?.unit}
                      </span>
                      <span>{formatCurrency(Number(i.rate))}/unit</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewId(po.id)}>
                    View
                  </Button>
                  {status === 'DRAFT' || status === 'ORDERED' ? (
                    <Button
                      size="sm"
                      className="bg-[#14532D]"
                      onClick={() =>
                        updateStatus.mutate({
                          id: po.id,
                          status: status === 'DRAFT' ? 'ORDERED' : 'ORDERED',
                        })
                      }
                      disabled={status !== 'DRAFT'}
                    >
                      {status === 'DRAFT' ? 'Mark Ordered' : 'Ordered'}
                    </Button>
                  ) : null}
                  {status === 'ORDERED' || status === 'PARTIALLY_RECEIVED' ? (
                    <Button size="sm" className="bg-[#14532D]" onClick={() => setReceiveId(po.id)}>
                      Receive Stock
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPdf(po.id, po.poNumber)}
                  >
                    Download PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printPdf(po.id)}>
                    Print
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => sharePdf(po.id, po.poNumber)}>
                    Share
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate.mutate(po.id)}>
                    Duplicate
                  </Button>
                  {status !== 'RECEIVED' && status !== 'CANCELLED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: po.id, status: 'CANCELLED' })}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreatePoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        suppliers={suppliers}
        items={items}
        preItemId={preItemId}
      />
      <ReceiveDialog poId={receiveId} onClose={() => setReceiveId(null)} orders={orders} />
      <ViewDialog poId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-xl" />}>
      <PurchaseOrdersPageInner />
    </Suspense>
  );
}

function CreatePoDialog({
  open,
  onOpenChange,
  suppliers,
  items,
  preItemId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suppliers: Array<{
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    paymentTerms?: string;
  }>;
  items: InventoryItemDto[];
  preItemId: string;
}) {
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const pre = items.find((i) => i.id === preItemId);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<
    Array<{ itemId: string; quantity: string; rate: string; tax: string }>
  >([
    {
      itemId: preItemId,
      quantity: pre ? String(Math.max(pre.minStock - pre.currentStock, 1)) : '',
      rate: pre ? String(pre.costPrice) : '',
      tax: '0',
    },
  ]);
  const [discount, setDiscount] = useState('0');
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpected] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const supplier = suppliers.find((s) => s.id === supplierId);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of lines) {
      const qty = Number(line.quantity || 0);
      const rate = Number(line.rate || 0);
      tax += Number(line.tax || 0);
      subtotal += qty * rate;
    }
    const d = Number(discount || 0);
    const del = Number(deliveryCharge || 0);
    const oth = Number(otherCharges || 0);
    return { subtotal, tax, grand: subtotal - d + tax + del + oth };
  }, [lines, discount, deliveryCharge, otherCharges]);

  const create = useMutation({
    mutationFn: () =>
      api.post('/inventory/purchase-orders', {
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        supplierRef: supplierRef || undefined,
        paymentTerms: paymentTerms || supplier?.paymentTerms,
        notes: notes || undefined,
        discount: Number(discount || 0),
        deliveryCharge: Number(deliveryCharge || 0),
        otherCharges: Number(otherCharges || 0),
        items: lines
          .filter((l) => l.itemId && Number(l.quantity) > 0)
          .map((l) => ({
            itemId: l.itemId,
            quantity: Number(l.quantity),
            rate: Number(l.rate),
            tax: Number(l.tax || 0),
          })),
      }),
    onSuccess: () => {
      toast('Purchase order created');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Create failed'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Supplier
            <select
              className={inputClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Supplier Contact
            <input
              className={inputClass}
              readOnly
              value={supplier?.contactPerson ?? supplier?.phone ?? ''}
            />
          </label>
          <label className="text-sm font-medium">
            Expected Delivery Date
            <input
              type="date"
              className={inputClass}
              value={expectedDeliveryDate}
              onChange={(e) => setExpected(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Supplier Reference Number
            <input
              className={inputClass}
              value={supplierRef}
              onChange={(e) => setSupplierRef(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Payment Terms
            <input
              className={inputClass}
              value={paymentTerms}
              placeholder={supplier?.paymentTerms ?? ''}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold">Items</p>
          {lines.map((line, idx) => {
            const ing = items.find((i) => i.id === line.itemId);
            const amount =
              Number(line.quantity || 0) * Number(line.rate || 0) + Number(line.tax || 0);
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <select
                  className="col-span-12 sm:col-span-4 h-10 rounded-lg border px-2 text-sm"
                  value={line.itemId}
                  onChange={(e) => {
                    const next = items.find((i) => i.id === e.target.value);
                    setLines((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              itemId: e.target.value,
                              rate: next ? String(next.costPrice) : r.rate,
                            }
                          : r,
                      ),
                    );
                  }}
                >
                  <option value="">Ingredient…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <input
                  className="col-span-4 sm:col-span-2 h-10 rounded-lg border px-2 text-sm"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)),
                    )
                  }
                />
                <div className="col-span-4 sm:col-span-1 text-xs text-muted-foreground pb-2">
                  {ing?.unit ?? ''}
                </div>
                <input
                  className="col-span-4 sm:col-span-2 h-10 rounded-lg border px-2 text-sm"
                  placeholder="Rate"
                  value={line.rate}
                  onChange={(e) =>
                    setLines((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, rate: e.target.value } : r)),
                    )
                  }
                />
                <input
                  className="col-span-4 sm:col-span-1 h-10 rounded-lg border px-2 text-sm"
                  placeholder="Tax"
                  value={line.tax}
                  onChange={(e) =>
                    setLines((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, tax: e.target.value } : r)),
                    )
                  }
                />
                <div className="col-span-6 sm:col-span-1 text-sm font-semibold pb-2">
                  {formatCurrency(amount)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="col-span-6 sm:col-span-1"
                  onClick={() => setLines((rows) => rows.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((rows) => [...rows, { itemId: '', quantity: '', rate: '', tax: '0' }])
            }
          >
            + Add Item
          </Button>
        </div>
        <div className="grid sm:grid-cols-4 gap-3 mt-3">
          <label className="text-sm">
            Discount
            <input
              className={inputClass}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Delivery Charges
            <input
              className={inputClass}
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Other Charges
            <input
              className={inputClass}
              value={otherCharges}
              onChange={(e) => setOtherCharges(e.target.value)}
            />
          </label>
          <div className="text-sm pt-6 font-bold text-[#14532D]">
            Grand Total {formatCurrency(totals.grand)}
          </div>
        </div>
        <label className="text-sm font-medium block mt-2">
          Notes
          <textarea
            className="w-full mt-1 rounded-lg border px-3 py-2 text-sm min-h-[64px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <DialogFooter>
          <Button
            className="bg-[#14532D]"
            disabled={!supplierId || create.isPending}
            onClick={() => create.mutate()}
          >
            Save as Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({
  poId,
  onClose,
  orders,
}: {
  poId: string | null;
  onClose: () => void;
  orders: Po[];
}) {
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const po = orders.find((o) => o.id === poId);
  const [qty, setQty] = useState<Record<string, string>>({});

  const receive = useMutation({
    mutationFn: () =>
      api.post('/inventory/grn', {
        poId,
        items: (po?.items ?? []).map((i) => {
          const pending = Number(i.quantity) - Number(i.receivedQty);
          const receivedQty = Number(qty[i.itemId] ?? pending);
          return { itemId: i.itemId, receivedQty, acceptedQty: receivedQty };
        }),
      }),
    onSuccess: () => {
      toast('Stock received and inventory updated');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      onClose();
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Receive failed'),
  });

  return (
    <Dialog open={Boolean(poId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Stock · {po?.poNumber}</DialogTitle>
        </DialogHeader>
        {!po ? null : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                <th className="py-2">Ingredient</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Pending</th>
                <th>This delivery</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((i) => {
                const pending = Number(i.quantity) - Number(i.receivedQty);
                return (
                  <tr key={i.itemId} className="border-b">
                    <td className="py-2 font-medium">{i.item.name}</td>
                    <td>
                      {Number(i.quantity)} {i.item.unit}
                    </td>
                    <td>
                      {Number(i.receivedQty)} {i.item.unit}
                    </td>
                    <td>
                      {pending} {i.item.unit}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="h-9 w-24 rounded-lg border px-2"
                        defaultValue={pending}
                        onChange={(e) => setQty((q) => ({ ...q, [i.itemId]: e.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <DialogFooter>
          <Button
            className="bg-[#14532D]"
            disabled={receive.isPending}
            onClick={() => receive.mutate()}
          >
            Save received quantities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ poId, onClose }: { poId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => api.get<Po>(`/inventory/purchase-orders/${poId}`),
    enabled: Boolean(poId),
  });
  return (
    <Dialog open={Boolean(poId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data?.poNumber ?? 'Purchase Order'}</DialogTitle>
        </DialogHeader>
        {data ? (
          <div className="text-sm space-y-2">
            <p>{data.supplier?.name}</p>
            <p>Status: {STATUS_LABEL[normalizeStatus(data.status)]}</p>
            <p>Total: {formatCurrency(Number(data.total))}</p>
            {data.notes ? <p>Notes: {data.notes}</p> : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
