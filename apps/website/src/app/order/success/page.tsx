'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, cn } from '@mdh/ui';
import { formatCurrency, PAYMENT_METHOD_LABELS, ORDER_STATUS_LABELS } from '@mdh/utils';
import type { OrderDto, BusinessSettingsDto } from '@mdh/types';
import { CheckCircle2, Download, ExternalLink, Home, Printer, Share2, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { OrderReceipt } from '@/components/receipt/order-receipt';
import { loadLastOrder, loadTrackToken } from '@/lib/last-order';
import {
  downloadReceiptPdf,
  openReceiptPdf,
  printReceipt,
  shareReceipt,
} from '@/lib/receipt-utils';
import { useToastStore } from '@/lib/toast-store';
import { trackMarketingEvent } from '@/lib/marketing-content';

function OrderSuccessFallback() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg text-center">
      <div className="animate-pulse space-y-4">
        <div className="w-20 h-20 bg-muted rounded-full mx-auto" />
        <div className="h-6 bg-muted rounded w-48 mx-auto" />
        <div className="h-4 bg-muted rounded w-64 mx-auto" />
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessFallback />}>
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const toast = useToastStore((s) => s.show);
  // Must start null so SSR and first client render match (sessionStorage is browser-only).
  const [cachedOrder, setCachedOrder] = useState<OrderDto | null>(null);
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    setCachedOrder(loadLastOrder());
    setCacheReady(true);
  }, []);

  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ['order-success', orderNumber],
    queryFn: () => {
      const token = loadTrackToken(orderNumber!);
      const q = token ? `?trackToken=${encodeURIComponent(token)}` : '';
      return api.get<OrderDto>(`/orders/track/${orderNumber}${q}`);
    },
    enabled:
      !!orderNumber && cacheReady && (!cachedOrder || cachedOrder.orderNumber !== orderNumber),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const order =
    cachedOrder?.orderNumber === orderNumber ? cachedOrder : (fetchedOrder ?? cachedOrder);

  useEffect(() => {
    if (!orderNumber) {
      router.replace('/');
    }
  }, [orderNumber, router]);

  useEffect(() => {
    if (order && orderNumber === order.orderNumber) {
      const key = `mdh-toast-${order.orderNumber}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        toast('✅ Order placed successfully.');
      }
    }
  }, [order, orderNumber, toast]);

  useEffect(() => {
    if (!order || typeof window === 'undefined') return;
    const popupId = localStorage.getItem('mdh_popup_attribution');
    if (!popupId) return;
    const conversionKey = `mdh_popup_conversion_${popupId}_${order.orderNumber}`;
    if (sessionStorage.getItem(conversionKey)) return;
    sessionStorage.setItem(conversionKey, '1');
    localStorage.removeItem('mdh_popup_attribution');
    void trackMarketingEvent(
      popupId,
      'conversion',
      { orderNumber: order.orderNumber },
      order.grandTotal,
    );
  }, [order]);

  if (!orderNumber) return null;

  if ((!cacheReady || isLoading) && !order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <div className="animate-pulse space-y-4">
          <div className="w-20 h-20 bg-muted rounded-full mx-auto" />
          <div className="h-6 bg-muted rounded w-48 mx-auto" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <p className="text-muted-foreground mb-4">Order not found.</p>
        <Link
          href="/"
          className={cn(
            'inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2',
            'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      await downloadReceiptPdf(order, settings);
    } catch {
      toast('❌ Unable to download receipt. Please try again.');
    }
  };

  const handleViewPdf = async () => {
    try {
      await openReceiptPdf(order, settings);
    } catch (err) {
      toast(err instanceof Error ? err.message : '❌ Unable to open receipt PDF.');
    }
  };

  const handleShare = async () => {
    try {
      await shareReceipt(order);
      toast('Receipt details copied.');
    } catch {
      toast('❌ Unable to share receipt.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#14532D]/10 mb-4"
        >
          <CheckCircle2 className="w-12 h-12 text-[#14532D]" strokeWidth={2} />
        </motion.div>
        <p className="text-3xl mb-2">🎉</p>
        <h1 className="text-2xl md:text-3xl font-bold text-[#14532D] mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-muted-foreground">Your order has been received.</p>
        <div className="mt-4 mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#14532D]">
          🪙 You’ll earn 1 Bronze Coin when your order is delivered.
          <br />1 Coin = ₹1 · Order more. Collect more. Save more.
        </div>
      </motion.div>

      <Card className="mb-6 border-[#F59E0B]/20 shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center pb-4 border-b border-dashed">
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <p className="text-2xl font-bold text-[#14532D] tracking-wide">{order.orderNumber}</p>
            <p className="text-sm text-[#F59E0B] font-medium mt-2">Estimated delivery: 25–30 min</p>
          </div>

          <div className="grid gap-3 text-sm">
            <DetailRow
              label="Payment"
              value={PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
            />
            <DetailRow label="Total" value={formatCurrency(order.grandTotal)} highlight />
            <DetailRow label="Status" value={ORDER_STATUS_LABELS[order.status] || order.status} />
            <div>
              <p className="text-muted-foreground mb-1">Delivery Address</p>
              <p className="font-medium leading-relaxed">{order.deliveryAddress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Link
          href={`/track/${order.orderNumber}`}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 py-2',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Truck className="w-4 h-4" />
          Track Order
        </Link>
        <Button onClick={handleViewPdf} variant="outline" className="gap-2">
          <ExternalLink className="w-4 h-4" />
          View PDF
        </Button>
        <Button onClick={handleDownload} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button onClick={() => printReceipt('order-receipt')} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </Button>
        <Button onClick={handleShare} variant="outline" className="gap-2 sm:col-span-2">
          <Share2 className="w-4 h-4" />
          Share Receipt
        </Button>
        <Link
          href="/"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 py-2 sm:col-span-3',
            'bg-[#14532D] text-white hover:bg-[#14532D]/90',
          )}
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <section aria-labelledby="receipt-heading" className="print:mt-0">
        <h2
          id="receipt-heading"
          className="text-lg font-semibold text-[#14532D] mb-4 text-center print:hidden"
        >
          Your Receipt
        </h2>
        <OrderReceipt order={order} settings={settings} id="order-receipt" />
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-bold text-[#14532D] text-lg' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}
