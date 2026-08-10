'use client';

import {
  formatCurrency,
  formatPackingLabel,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@mdh/utils';
import type { PosBillDto } from '@mdh/types';
import { BRAND } from '@mdh/utils';

export function PosReceiptPreview({
  bill,
  cashierName,
}: {
  bill: PosBillDto;
  cashierName?: string;
}) {
  return (
    <div className="bg-white text-gray-900 p-4 rounded-lg text-sm font-mono max-w-sm mx-auto shadow-inner border">
      <div className="text-center border-b pb-2 mb-2">
        <p className="font-bold text-base">{BRAND.name}</p>
        <p className="text-xs text-gray-500">{BRAND.tagline}</p>
      </div>
      <div className="space-y-0.5 text-xs mb-2">
        <p>Order: {bill.orderNumber}</p>
        <p>{new Date(bill.createdAt).toLocaleString('en-IN')}</p>
        {bill.tableLabel && <p>Table: {bill.tableLabel}</p>}
        {cashierName && <p>Cashier: {cashierName}</p>}
        <p>Type: {bill.orderType.replace('_', ' ')}</p>
      </div>
      <div className="border-t border-b py-2 space-y-1">
        {bill.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-2">
            <span>
              {item.quantity}× {item.productName}
            </span>
            <span>{formatCurrency(item.totalPrice)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(bill.subtotal)}</span>
        </div>
        {bill.deliveryCharge > 0 && (
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatCurrency(bill.deliveryCharge)}</span>
          </div>
        )}
        {bill.packingCharge > 0 && (
          <div className="flex justify-between">
            <span>{formatPackingLabel(bill.packedItemCount)}</span>
            <span>{formatCurrency(bill.packingCharge)}</span>
          </div>
        )}
        {bill.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>GST</span>
            <span>{formatCurrency(bill.taxAmount)}</span>
          </div>
        )}
        {bill.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount</span>
            <span>-{formatCurrency(bill.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t">
          <span>TOTAL</span>
          <span>{formatCurrency(bill.grandTotal)}</span>
        </div>
        {bill.paymentMethod && (
          <p className="pt-1">
            Paid via {PAYMENT_METHOD_LABELS[bill.paymentMethod] ?? bill.paymentMethod}
          </p>
        )}
      </div>
      <p className="text-center text-xs mt-3 text-gray-500">Thank you! Visit again ❤️</p>
    </div>
  );
}

export const POS_STATUS_STEPS = ['ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'DELIVERED'] as const;

export function PosOrderTimeline({ status }: { status: string }) {
  const idx = POS_STATUS_STEPS.indexOf(status as (typeof POS_STATUS_STEPS)[number]);
  return (
    <div className="flex gap-1 flex-wrap">
      {POS_STATUS_STEPS.map((step, i) => (
        <div
          key={step}
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            i <= idx ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}
        >
          {ORDER_STATUS_LABELS[step] ?? step}
        </div>
      ))}
    </div>
  );
}
