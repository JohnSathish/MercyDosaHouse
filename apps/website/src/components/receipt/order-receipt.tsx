'use client';

import { useEffect, useState } from 'react';
import type { OrderDto, BusinessSettingsDto } from '@mdh/types';
import { BRAND, formatCurrency, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@mdh/utils';
import {
  generateQrDataUrl,
  getReceiptQrPayload,
  loadReceiptLogoDataUrl,
} from '@/lib/receipt-utils';
import { RECEIPT_LOGO_BUNDLED_SRC, RECEIPT_LOGO_PATH } from '@/lib/brand-assets';

interface OrderReceiptProps {
  order: OrderDto;
  settings?: Pick<BusinessSettingsDto, 'phone' | 'businessName' | 'tagline'>;
  id?: string;
}

function formatReceiptDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function formatReceiptTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

export function OrderReceipt({ order, settings, id = 'order-receipt' }: OrderReceiptProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>(RECEIPT_LOGO_BUNDLED_SRC);
  const businessName = settings?.businessName || BRAND.name;
  const tagline = settings?.tagline || 'Crispy Dosas. Happy Hearts.';
  const phone = settings?.phone || order.customerPhone;

  useEffect(() => {
    generateQrDataUrl(getReceiptQrPayload(order)).then(setQrUrl);
    loadReceiptLogoDataUrl().then((dataUrl) => {
      if (dataUrl) setLogoUrl(dataUrl);
    });
  }, [order]);

  return (
    <div
      id={id}
      className="mx-auto w-full max-w-[80mm] bg-white text-[#1F2937] font-sans text-sm shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none"
    >
      <div className="bg-[#14532D] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Native img with bundled src + data URL — works on screen, print, and PDF */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={businessName}
            width={48}
            height={48}
            decoding="sync"
            className="h-12 w-12 shrink-0 rounded-full bg-white p-0.5 object-contain"
            onError={() => {
              setLogoUrl((current) => {
                if (current.startsWith('data:')) {
                  return `${window.location.origin}${RECEIPT_LOGO_PATH}`;
                }
                if (current === RECEIPT_LOGO_BUNDLED_SRC) {
                  return RECEIPT_LOGO_PATH;
                }
                return RECEIPT_LOGO_BUNDLED_SRC;
              });
            }}
          />
          <div className="min-w-0 text-left">
            <h2 className="font-bold text-base leading-tight">{businessName}</h2>
            <p className="text-xs text-white/90 mt-0.5 leading-snug">{tagline}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-1">
        <ReceiptRow label="Order No" value={order.orderNumber} bold />
        <ReceiptRow label="Date" value={formatReceiptDate(order.createdAt)} />
        <ReceiptRow label="Time" value={formatReceiptTime(order.createdAt)} />
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="font-semibold text-xs uppercase tracking-wide text-[#14532D] mb-2">
          Customer
        </p>
        <p className="font-medium">{order.customerName}</p>
        <p className="text-muted-foreground">{order.customerPhone}</p>
        <p className="mt-1 text-sm leading-relaxed">{order.deliveryAddress}</p>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="font-semibold text-xs uppercase tracking-wide text-[#14532D] mb-2">Items</p>
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-2 text-sm">
              <span>
                {item.quantity} x {item.productName}
                {item.variantName ? ` (${item.variantName})` : ''}
              </span>
              <span className="shrink-0 font-medium">{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      <div className="px-4 py-3 space-y-1">
        <ReceiptRow label="Subtotal" value={formatCurrency(order.subtotal)} />
        <ReceiptRow label="Delivery" value={formatCurrency(order.deliveryCharge)} />
        {order.packingCharge > 0 && (
          <ReceiptRow label="Packing" value={formatCurrency(order.packingCharge)} />
        )}
        {order.discount > 0 && (
          <ReceiptRow label="Discount" value={`-${formatCurrency(order.discount)}`} />
        )}
        <div className="flex justify-between font-bold text-base pt-1 text-[#14532D]">
          <span>TOTAL</span>
          <span>{formatCurrency(order.grandTotal)}</span>
        </div>
      </div>

      <Divider />

      <div className="px-4 py-3 space-y-1">
        <ReceiptRow
          label="Payment"
          value={PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
        />
        <ReceiptRow
          label="Order Status"
          value={ORDER_STATUS_LABELS[order.status] || order.status}
        />
      </div>

      <Divider />

      <div className="px-4 py-4 flex flex-col items-center">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="Order QR Code" className="w-32 h-32" />
        ) : (
          <div className="w-32 h-32 bg-muted animate-pulse rounded" />
        )}
        <p className="text-xs text-muted-foreground mt-2 text-center">Scan for order details</p>
      </div>

      <div className="bg-[#FFF8E8] border-t border-[#F59E0B]/30 px-4 py-4 text-center">
        <p className="font-semibold text-[#14532D]">Thank You ❤️</p>
        <p className="text-sm text-muted-foreground">Visit Again</p>
        <p className="font-bold text-[#14532D] mt-1">{businessName}</p>
        <p className="text-sm">{phone}</p>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'text-[#14532D]' : ''}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-gray-200 mx-4" />;
}
