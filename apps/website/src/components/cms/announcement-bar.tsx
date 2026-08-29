'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCmsContent } from '@/components/cms/cms-content-provider';

const ROTATE_MS = 4500;

export const DEFAULT_BAR_ANNOUNCEMENTS: {
  id: string;
  message: string;
  linkUrl?: string;
}[] = [
  { id: 'bar-fresh', message: '🥳 Freshly Made. Hot Delivered.' },
  { id: 'bar-rewards', message: '⭐ Earn Reward Points on Every Order', linkUrl: '/dashboard' },
  { id: 'bar-delivery', message: '🚀 Fast Delivery Across Tura' },
  { id: 'bar-payment', message: '💳 Pay Online or Cash on Delivery' },
  { id: 'bar-birthday', message: '🎂 Birthday Special Offers Available', linkUrl: '/contact' },
];

export function AnnouncementBar() {
  const cms = useCmsContent();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const bars = cms?.announcements
      .filter((a) => a.type === 'BAR' && a.isActive)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((a) => ({
        id: a.id,
        message: a.message,
        linkUrl: a.linkUrl ?? undefined,
      }));
    return bars?.length ? bars : DEFAULT_BAR_ANNOUNCEMENTS;
  }, [cms]);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (reducedMotion || items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length, reducedMotion]);

  const current = items[index] ?? items[0];
  if (!current) return null;

  const content = current.linkUrl ? (
    <Link href={current.linkUrl} className="hover:underline">
      {current.message}
    </Link>
  ) : (
    <span>{current.message}</span>
  );

  return (
    <div
      className="bg-[#14532D] text-white text-center text-sm py-2 px-4 shrink-0 overflow-hidden relative min-h-[2.25rem] flex items-center justify-center"
      aria-label="Promotional announcements"
    >
      {reducedMotion || items.length <= 1 ? (
        <span className="font-medium" aria-live="polite">
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
            className="font-medium absolute inset-0 flex items-center justify-center px-4"
            aria-live="polite"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
