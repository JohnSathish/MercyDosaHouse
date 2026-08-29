'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@mdh/ui';
import { ArrowRight, X } from 'lucide-react';
import type { MarketingAnnouncementDto } from '@mdh/types';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { dismissAnnouncement, trackMarketingEvent } from '@/lib/marketing-content';

const SESSION_KEY = 'mdh_promotional_popup_seen';
const DAY_KEY = 'mdh_promotional_popup_day';
const CUSTOMER_KEY = 'mdh_promotional_popup_customer';
const CLOSED_KEY = 'mdh_promotional_popup_closed';

function shouldShow(item: MarketingAnnouncementDto) {
  if (typeof window === 'undefined') return false;
  const frequency = item.popupFrequency ?? 'ONCE_SESSION';
  if (frequency === 'EVERY_VISIT') return true;
  if (frequency === 'ONCE_SESSION') return !sessionStorage.getItem(`${SESSION_KEY}_${item.id}`);
  if (frequency === 'ONCE_DAY') {
    return localStorage.getItem(`${DAY_KEY}_${item.id}`) !== new Date().toDateString();
  }
  if (frequency === 'ONCE_CUSTOMER') return !localStorage.getItem(`${CUSTOMER_KEY}_${item.id}`);
  return !localStorage.getItem(`${CLOSED_KEY}_${item.id}`);
}

function markShown(item: MarketingAnnouncementDto) {
  const frequency = item.popupFrequency ?? 'ONCE_SESSION';
  if (frequency === 'ONCE_SESSION') sessionStorage.setItem(`${SESSION_KEY}_${item.id}`, '1');
  if (frequency === 'ONCE_DAY')
    localStorage.setItem(`${DAY_KEY}_${item.id}`, new Date().toDateString());
  if (frequency === 'ONCE_CUSTOMER') localStorage.setItem(`${CUSTOMER_KEY}_${item.id}`, '1');
}

function safeDestination(item: MarketingAnnouncementDto) {
  const url = item.ctaUrl ?? item.linkUrl ?? '/menu';
  if (url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://')) return url;
  return '/menu';
}

function whatsappDestination(item: MarketingAnnouncementDto) {
  const configured = item.ctaUrl?.trim() ?? '';
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(configured)) return configured;
  const number = configured.replace(/\D/g, '');
  if (!number) return null;
  const message = item.ctaMessage ? `?text=${encodeURIComponent(item.ctaMessage)}` : '';
  return `https://wa.me/${number}${message}`;
}

export function PromotionalPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const marketing = useMarketing();
  const [item, setItem] = useState<MarketingAnnouncementDto | null>(null);
  const [open, setOpen] = useState(false);
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname !== '/') return;
    const popup = marketing?.promotionalPopup;
    if (!popup || shownRef.current === popup.id || !shouldShow(popup)) return;
    shownRef.current = popup.id;
    markShown(popup);
    const timer = window.setTimeout(() => {
      setItem(popup);
      setOpen(true);
      void trackMarketingEvent(popup.id, 'impression');
      void trackMarketingEvent(popup.id, 'view');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [marketing, pathname]);

  const close = useCallback(() => {
    if (!item || item.mandatory || item.dismissible === false) return;
    setOpen(false);
    localStorage.setItem(`${CLOSED_KEY}_${item.id}`, '1');
    void dismissAnnouncement(item.id);
  }, [item]);

  const handleCta = useCallback(() => {
    if (!item) return;
    const type = item.ctaType ?? (item.ctaUrl || item.linkUrl ? 'CUSTOM_URL' : 'NONE');
    const event =
      type === 'WHATSAPP'
        ? 'whatsapp_click'
        : type === 'ORDER_NOW'
          ? 'order_click'
          : type === 'PREBOOK_NOW'
            ? 'prebook_click'
            : 'cta_click';
    void trackMarketingEvent(item.id, event);
    if (type === 'ORDER_NOW' || type === 'PREBOOK_NOW') {
      localStorage.setItem('mdh_popup_attribution', item.id);
    }
    if (item.popupFrequency === 'ALWAYS_UNTIL_CLOSED') {
      localStorage.setItem(`${CLOSED_KEY}_${item.id}`, '1');
    }
    setOpen(false);
    if (type === 'WHATSAPP') {
      const destination = whatsappDestination(item);
      if (destination) window.open(destination, '_blank', 'noopener,noreferrer');
      return;
    }
    if (type === 'ORDER_NOW') {
      router.push('/menu');
      return;
    }
    if (type === 'PREBOOK_NOW') {
      router.push('/menu?preorder=true');
      return;
    }
    const destination = safeDestination(item);
    if (destination.startsWith('http')) window.open(destination, '_blank', 'noopener,noreferrer');
    else router.push(destination);
  }, [item, router]);

  if (pathname !== '/' || !item) return null;
  const hasCta = item.ctaType !== 'NONE' && (item.ctaType || item.ctaUrl || item.linkUrl);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotional-popup-title"
          onClick={() => item.closeOnOverlay !== false && close()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ duration: 0.25 }}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#FFF8E8] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {!item.mandatory && item.dismissible !== false && (
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white"
                aria-label="Close promotion"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {(item.bannerImageUrl || item.heroBannerImageUrl) && (
              <img
                src={item.bannerImageUrl ?? item.heroBannerImageUrl ?? ''}
                alt={item.headline || item.title}
                className="max-h-[52dvh] w-full object-contain"
              />
            )}
            {!item.imageOnly && (
              <div className="space-y-3 p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F59E0B]">
                  {item.popupType?.replaceAll('_', ' ') || 'Special announcement'}
                </p>
                <h2
                  id="promotional-popup-title"
                  className="text-2xl font-bold text-[#14532D] sm:text-3xl"
                >
                  {item.headline || item.title}
                </h2>
                {item.subheadline && (
                  <p className="font-medium text-[#14532D]">{item.subheadline}</p>
                )}
                <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                  {item.message}
                </p>
                {(item.price || item.availability) && (
                  <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#14532D]">
                    {item.price && (
                      <span className="rounded-full bg-[#F59E0B]/20 px-3 py-1">{item.price}</span>
                    )}
                    {item.availability && (
                      <span className="rounded-full bg-[#14532D]/10 px-3 py-1">
                        {item.availability}
                      </span>
                    )}
                  </div>
                )}
                {hasCta && (
                  <Button className="w-full gap-2 bg-[#14532D] text-white" onClick={handleCta}>
                    {item.ctaText || 'Explore now'} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
