'use client';

import type { OrderDto } from '@mdh/types';
import { formatCurrency, formatPackingLabel, ORDER_STATUS_LABELS } from '@mdh/utils';
import {
  formatReceiptDateTime,
  isDeliveryOrder,
  orderDiscount,
  receiptPaymentLabel,
  resolveReceiptBusiness,
  type ReceiptBusiness,
} from '@/lib/order-receipt';

export function OrderReceiptTicket({
  order,
  settings,
}: {
  order: OrderDto;
  settings?: ReceiptBusiness | null;
}) {
  const biz = resolveReceiptBusiness(settings);
  const { date, time } = formatReceiptDateTime(order.createdAt);
  const discount = orderDiscount(order);
  const packed = order.packedItemCount ?? order.items.reduce((s, i) => s + i.quantity, 0);
  const address = [order.deliveryAddress, order.deliveryLandmark].filter(Boolean).join(', ');

  return (
    <article
      data-order-receipt
      className="mx-auto w-[80mm] max-w-full overflow-hidden rounded-xl border border-[#14532D]/15 bg-[#FFF8E8] text-[#1F2937] shadow-sm"
    >
      <header className="bg-[#14532D] px-3 py-3 text-white">
        <div className="flex items-center gap-2">
          {biz.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={biz.logoUrl}
              alt=""
              className="h-11 w-11 rounded-full bg-white object-contain p-0.5"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold leading-tight">{biz.businessName}</p>
            <p className="text-[10px] font-medium leading-snug text-[#FDE68A]">{biz.tagline}</p>
          </div>
        </div>
        <div className="mt-2 h-0.5 w-full bg-[#F59E0B]" />
      </header>

      <div className="space-y-2 px-3 py-3 text-[11px] leading-snug">
        <Row label="Order No" value={order.orderNumber} strong />
        <Row label="Date" value={date} />
        <Row label="Time" value={time} />
        <Row label="Status" value={ORDER_STATUS_LABELS[order.status] || order.status} />

        <hr className="border-dashed border-[#14532D]/20" />
        <p className="font-bold text-[#14532D]">Customer</p>
        <p className="break-words font-semibold">{order.customerName}</p>
        <p className="break-all">{order.customerPhone}</p>
        {isDeliveryOrder(order) && address ? <p className="break-words">{address}</p> : null}

        <hr className="border-dashed border-[#14532D]/20" />
        <p className="font-bold text-[#14532D]">Items</p>
        <ul className="space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words">
                {item.quantity} × {item.productName}
                {item.variantName ? ` (${item.variantName})` : ''}
                <span className="mt-0.5 block text-[10px] text-gray-500">
                  {formatCurrency(item.unitPrice)} each
                </span>
              </span>
              <span className="shrink-0 font-semibold">{formatCurrency(item.totalPrice)}</span>
            </li>
          ))}
        </ul>

        <hr className="border-dashed border-[#14532D]/20" />
        <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
        {order.packingCharge > 0 ? (
          <Row label={formatPackingLabel(packed)} value={formatCurrency(order.packingCharge)} />
        ) : null}
        <Row label="Delivery charge" value={formatCurrency(order.deliveryCharge)} />
        {discount > 0 ? (
          <Row
            label={order.discountName ? `Discount (${order.discountName})` : 'Discount'}
            value={`-${formatCurrency(discount)}`}
          />
        ) : null}
        <Row label="Grand Total" value={formatCurrency(order.grandTotal)} strong />
        <Row label="Payment method" value={receiptPaymentLabel(order.paymentMethod)} />

        {(biz.phone || biz.address) && (
          <>
            <hr className="border-dashed border-[#14532D]/20" />
            {biz.phone ? <p>Contact: {biz.phone}</p> : null}
            {biz.address ? <p className="break-words">{biz.address}</p> : null}
          </>
        )}

        <p className="pt-2 text-center text-[10px] font-semibold text-[#14532D]">
          Thank you for ordering from Mercy Dosa House ❤️
        </p>
      </div>
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-600">{label}</span>
      <span
        className={`max-w-[58%] break-words text-right ${strong ? 'font-extrabold' : 'font-medium'}`}
      >
        {value}
      </span>
    </div>
  );
}
