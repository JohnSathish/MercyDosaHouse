'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { dismissAnnouncement, getSessionId, trackMarketingEvent } from '@/lib/marketing-content';
import type { MarketingAnnouncementDto } from '@mdh/types';

const ROTATE_MS = 4500;
const DISMISS_KEY = 'mdh_dismissed_announcements';

function getDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function setDismissed(ids: string[]) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
}

export function AnnouncementBar() {
  const marketing = useMarketing();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissedState] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDismissedState(getDismissed());
    setMounted(true);
  }, []);

  const items = useMemo(() => {
    const fromPlacement = marketing?.byPlacement?.TOP_BAR ?? [];
    const bars = (fromPlacement.length ? fromPlacement : (marketing?.announcements ?? []))
      .filter((a) => a.type === 'BAR' && !dismissed.includes(a.id))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return bars;
  }, [marketing, dismissed]);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (!items[0]) return;
    trackMarketingEvent(items[0].id, 'impression');
  }, [items]);

  useEffect(() => {
    if (reducedMotion || items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length, reducedMotion]);

  const current: MarketingAnnouncementDto | undefined = items[index] ?? items[0];
  if (!mounted || !current) return null;

  const handleDismiss = async () => {
    if (!current.dismissible) return;
    const next = [...dismissed, current.id];
    setDismissedState(next);
    setDismissed(next);
    await dismissAnnouncement(current.id);
  };

  const text = current.icon ? `${current.icon} ${current.message}` : current.message;
  const content =
    current.ctaUrl || current.linkUrl ? (
      <Link
        href={current.ctaUrl ?? current.linkUrl ?? '#'}
        className="hover:underline"
        onClick={() => trackMarketingEvent(current.id, 'cta_click')}
      >
        {text}
      </Link>
    ) : (
      <span>{text}</span>
    );

  return (
    <div
      className="bg-[#14532D] text-white text-center text-sm py-2 px-4 shrink-0 overflow-hidden relative min-h-[2.25rem] flex items-center justify-center gap-2"
      aria-label="Promotional announcements"
    >
      {reducedMotion || items.length <= 1 ? (
        <span className="font-medium flex-1" aria-live="polite">
          {content}
        </span>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="font-medium absolute inset-0 flex items-center justify-center px-10"
            aria-live="polite"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      )}
      {current.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
