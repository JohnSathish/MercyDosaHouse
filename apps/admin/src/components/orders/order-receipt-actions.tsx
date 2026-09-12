'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Download, Printer, Share2 } from 'lucide-react';
import { Button } from '@mdh/ui';
import type { BusinessSettingsDto, OrderDto, ThemeSettingsDto } from '@mdh/types';
import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import {
  downloadOrderReceiptPdf,
  printOrderReceiptHtml,
  buildReceiptPrintHtml,
  shareOrderReceipt,
  type ReceiptBusiness,
} from '@/lib/order-receipt';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderReceiptTicket } from './order-receipt-ticket';

function useReceiptBusiness(): ReceiptBusiness | null {
  const { data: business } = useQuery({
    queryKey: ['admin-business-settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
    staleTime: 5 * 60 * 1000,
  });
  const { data: theme } = useQuery({
    queryKey: ['admin-theme-settings'],
    queryFn: () => api.get<ThemeSettingsDto>('/cms/theme'),
    staleTime: 5 * 60 * 1000,
  });
  if (!business && !theme) return null;
  const logo = theme?.logoUrl;
  const logoUrl = !logo
    ? `${APP_URLS.website}/images/logo.png`
    : logo.startsWith('http')
      ? logo
      : `${APP_URLS.website}${logo.startsWith('/') ? logo : `/${logo}`}`;
  return { ...business, logoUrl } as ReceiptBusiness;
}

export function OrderReceiptActions({ order, compact }: { order: OrderDto; compact?: boolean }) {
  const toast = useToastStore((s) => s.show);
  const settings = useReceiptBusiness();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const { data: fullOrder } = useQuery({
    queryKey: ['admin-order', order.id],
    queryFn: () => api.get<OrderDto>(`/orders/${order.id}`),
    enabled: dialogOpen,
    staleTime: 15_000,
  });
  const receiptOrder = fullOrder ?? order;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const loadOrder = async () =>
    fullOrder ?? api.get<OrderDto>(`/orders/${order.id}`).catch(() => order);

  const run = async (fn: (ready: OrderDto) => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      const ready = await loadOrder();
      await fn(ready);
      toast(ok);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not prepare the receipt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex" ref={menuRef}>
      <Button
        size="sm"
        variant="outline"
        className={compact ? 'min-h-[44px] rounded-r-none border-r-0' : 'rounded-r-none border-r-0'}
        onClick={() => {
          setMenuOpen(false);
          setDialogOpen(true);
        }}
      >
        Receipt
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={compact ? 'min-h-[44px] rounded-l-none px-2' : 'rounded-l-none px-2'}
        aria-label="Receipt options"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      {menuOpen ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border bg-white py-1 shadow-lg dark:bg-gray-900">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF8E8]"
            onClick={() => {
              setMenuOpen(false);
              setDialogOpen(true);
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF8E8]"
            disabled={busy}
            onClick={() => {
              setMenuOpen(false);
              void run(
                (ready) => downloadOrderReceiptPdf(ready, settings, 'a4'),
                'Receipt downloaded',
              );
            }}
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF8E8]"
            disabled={busy}
            onClick={() => {
              setMenuOpen(false);
              setDialogOpen(true);
            }}
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          {canShare ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF8E8]"
              disabled={busy}
              onClick={() => {
                setMenuOpen(false);
                void run((ready) => shareOrderReceipt(ready, settings), 'Receipt shared');
              }}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer receipt</DialogTitle>
            <DialogDescription>
              {receiptOrder.orderNumber} · available for every order status
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center overflow-x-auto pb-2">
            <div id={`order-receipt-${receiptOrder.id}`}>
              <OrderReceiptTicket order={receiptOrder} settings={settings} />
            </div>
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  (ready) => downloadOrderReceiptPdf(ready, settings, 'a4'),
                  'Receipt downloaded',
                )
              }
            >
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async (ready) => {
                  printOrderReceiptHtml(
                    buildReceiptPrintHtml(ready, settings),
                    `Receipt ${ready.orderNumber}`,
                  );
                }, 'Print dialog opened')
              }
            >
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
            {canShare ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run((ready) => shareOrderReceipt(ready, settings), 'Receipt shared')
                }
              >
                <Share2 className="mr-1 h-4 w-4" /> Share
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    (ready) => downloadOrderReceiptPdf(ready, settings, 'thermal'),
                    '80mm receipt downloaded',
                  )
                }
              >
                80mm PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
