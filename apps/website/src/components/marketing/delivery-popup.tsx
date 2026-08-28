'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@mdh/ui';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { dismissAnnouncement, getSessionId, trackMarketingEvent } from '@/lib/marketing-content';
import { DeliveryNoticeBody } from '@/components/marketing/delivery-notice';
import type { MarketingAnnouncementDto } from '@mdh/types';

const POPUP_SESSION_KEY = 'mdh_popup_shown';
const POPUP_DAY_KEY = 'mdh_popup_day';

function shouldShowPopup(item: MarketingAnnouncementDto): boolean {
  if (typeof window === 'undefined') return false;
  const freq = item.popupFrequency ?? 'ONCE_SESSION';
  if (freq === 'EVERY_VISIT') return true;
  if (freq === 'ONCE_SESSION') {
    const shown = sessionStorage.getItem(`${POPUP_SESSION_KEY}_${item.id}`);
    return !shown;
  }
  if (freq === 'ONCE_DAY') {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`${POPUP_DAY_KEY}_${item.id}`);
    return stored !== today;
  }
  return true;
}

function markPopupShown(item: MarketingAnnouncementDto) {
  const freq = item.popupFrequency ?? 'ONCE_SESSION';
  if (freq === 'ONCE_SESSION') {
    sessionStorage.setItem(`${POPUP_SESSION_KEY}_${item.id}`, '1');
  }
  if (freq === 'ONCE_DAY') {
    localStorage.setItem(`${POPUP_DAY_KEY}_${item.id}`, new Date().toDateString());
  }
}

export function DeliveryPopup() {
  const marketing = useMarketing();
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<MarketingAnnouncementDto | null>(null);

  useEffect(() => {
    const popup = marketing?.byPlacement?.POPUP?.[0];
    if (!popup) return;
    if (!shouldShowPopup(popup)) return;
    setItem(popup);
    setOpen(true);
    trackMarketingEvent(popup.id, 'view');
    markPopupShown(popup);
  }, [marketing]);

  const close = useCallback(async () => {
    if (item && !item.mandatory) {
      await dismissAnnouncement(item.id);
    }
    setOpen(false);
  }, [item]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl bg-[#FFF8E8] border border-[#14532D]/10 shadow-xl p-6"
          >
            {!item.mandatory && (
              <button
                type="button"
                onClick={close}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
            {item.icon && <p className="text-3xl mb-2">{item.icon}</p>}
            <h2 className="text-lg font-bold text-[#14532D] mb-2">{item.title}</h2>
            <DeliveryNoticeBody text={item.message} className="mb-4" />
            {marketing?.delivery && (
              <div className="rounded-xl bg-white border border-[#14532D]/10 p-3 text-sm text-gray-600 mb-4 space-y-1">
                {marketing.delivery.areas?.length > 0 && (
                  <p>
                    <strong>Areas:</strong> {marketing.delivery.areas.join(', ')}
                  </p>
                )}
                {marketing.delivery.orderWindow && (
                  <p>
                    <strong>Order:</strong> {marketing.delivery.orderWindow}
                  </p>
                )}
                {marketing.delivery.deliveryWindow && (
                  <p>
                    <strong>Delivery:</strong> {marketing.delivery.deliveryWindow}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {(item.ctaUrl || item.linkUrl) && (
                <Link
                  href={item.ctaUrl ?? item.linkUrl ?? '/menu'}
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-[#14532D] px-4 py-2 text-sm font-medium text-white hover:bg-[#14532D]/90"
                  onClick={() => {
                    void trackMarketingEvent(item.id, 'cta_click');
                    // Close before client navigation — popup lives in the root shell and
                    // otherwise stays open over /menu when using Next.js Link.
                    void close();
                  }}
                >
                  {item.ctaText ?? 'Order Now'}
                </Link>
              )}
              {!item.mandatory && (
                <Button variant="outline" onClick={close} className="flex-1">
                  {item.dismissible ? 'Got it' : 'Close'}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Call when user selects home delivery in checkout flow */
export function useDeliveryPopupTrigger() {
  const marketing = useMarketing();

  return useCallback(() => {
    const popup = marketing?.byPlacement?.POPUP?.[0];
    if (!popup || !shouldShowPopup(popup)) return;
    markPopupShown(popup);
    trackMarketingEvent(popup.id, 'view');
  }, [marketing]);
}

export function DeliveryPopupTrigger({
  open,
  onClose,
  message,
  expansionMessage,
  actionLabel = 'Understood',
}: {
  open: boolean;
  onClose: () => void;
  message: string;
  expansionMessage?: string | null;
  actionLabel?: string;
}) {
  const marketing = useMarketing();
  const expansion = expansionMessage?.trim() || marketing?.delivery?.expansionMessage?.trim() || '';
  const showExpansion = expansion && expansion !== message.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#FFF8E8] p-6 shadow-xl">
            <p className="text-2xl mb-2">🥡</p>
            <h2 className="text-lg font-bold text-[#14532D] mb-2">Delivery Update</h2>
            <p className="text-sm text-gray-700 mb-2">{message}</p>
            {showExpansion ? (
              <p className="text-xs text-[#F59E0B] mb-4">{expansion}</p>
            ) : (
              <p className="text-xs text-[#14532D] font-medium mb-4">
                You can still place a pickup order.
              </p>
            )}
            <Button onClick={onClose} className="w-full bg-[#14532D]">
              {actionLabel}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
