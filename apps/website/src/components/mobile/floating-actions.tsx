'use client';

import { useEffect, useState } from 'react';
import { Phone, MessageCircle, ArrowUp } from 'lucide-react';
import { cn } from '@mdh/ui';

interface FloatingActionsProps {
  phone?: string;
  whatsapp?: string;
}

export function FloatingActions({ phone = '9566363655', whatsapp }: FloatingActionsProps) {
  const [showTop, setShowTop] = useState(false);
  const wa = whatsapp || phone;
  const waDigits = wa.replace(/\D/g, '');
  const waUrl = `https://wa.me/91${waDigits.startsWith('91') ? waDigits.slice(2) : waDigits}`;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  return (
    <div className="lg:hidden fixed right-4 bottom-20 z-30 flex flex-col gap-3 items-end safe-area-pb">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg active:scale-95 transition-transform"
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
      <a
        href={`tel:${phone}`}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14532D] text-white shadow-lg active:scale-95 transition-transform"
        aria-label="Call restaurant"
      >
        <Phone className="h-5 w-5" />
      </a>
      <button
        type="button"
        onClick={scrollTop}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#14532D] border border-gray-200 shadow-lg active:scale-95 transition-all',
          showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
