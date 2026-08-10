'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarClock, Sparkles } from 'lucide-react';
import { Button } from '@mdh/ui';
import { useCheckoutStore } from '@/lib/checkout-store';

const BENEFITS = [
  'Customers save 10% on their order',
  "Know the next day's demand in advance",
  'Purchase the right quantity of ingredients',
  'Less food wastage',
  'Faster preparation during peak hours',
  'Better kitchen planning and staff scheduling',
];

export function PreOrderBanner() {
  const setDeliveryTiming = useCheckoutStore((s) => s.setDeliveryTiming);
  const setScheduledDate = useCheckoutStore((s) => s.setScheduledDate);
  const setScheduledSlot = useCheckoutStore((s) => s.setScheduledSlot);

  function handleScheduleClick() {
    setDeliveryTiming('scheduled');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().slice(0, 10));
    setScheduledSlot('8:00 AM - 9:00 AM');
  }

  return (
    <section className="py-10 md:py-14 bg-gradient-to-br from-[#14532D] via-[#1a6b3c] to-[#14532D] text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 hero-pattern pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 px-3 py-1 text-xs font-bold text-[#FDE68A] mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Smart Savings Offer
            </span>
            <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-3">
              📅 Plan Ahead, Save More!
            </h2>
            <p className="text-white/85 text-base md:text-lg leading-relaxed mb-2">
              🎉 Get <strong className="text-[#F59E0B]">10% OFF</strong> on all orders placed at
              least <strong>1 day in advance</strong>!
            </p>
            <p className="text-white/70 text-sm md:text-base mb-6">
              Plan ahead, save more, and enjoy fresh food prepared just for you — delivered on your
              chosen date and time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/checkout" onClick={handleScheduleClick}>
                <Button
                  size="lg"
                  className="rounded-2xl bg-[#F59E0B] text-[#1F2937] hover:bg-[#F59E0B]/90 font-semibold min-h-[48px] shadow-lg shadow-[#F59E0B]/25"
                >
                  Schedule Order & Save 10%
                </Button>
              </Link>
              <Link href="/checkout">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-2xl border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white min-h-[48px] shadow-sm"
                  onClick={handleScheduleClick}
                >
                  <CalendarClock className="h-4 w-4 mr-2 shrink-0" /> Choose Date & Time
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 md:p-6"
          >
            <p className="text-sm font-bold uppercase tracking-wider text-[#F59E0B] mb-3">
              Benefits for Mercy Dosa House
            </p>
            <ul className="space-y-2.5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm text-white/90">
                  <span className="text-[#F59E0B] mt-0.5 shrink-0">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/55 mt-4 border-t border-white/10 pt-3">
              Discount applies to food items only. Packing and delivery charges are excluded.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function PreOrderCartPromo() {
  const setDeliveryTiming = useCheckoutStore((s) => s.setDeliveryTiming);
  const setScheduledDate = useCheckoutStore((s) => s.setScheduledDate);

  return (
    <div className="rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-r from-[#FFF8E8] to-amber-50 p-4 mb-4">
      <p className="text-sm font-bold text-[#14532D] flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-[#F59E0B]" />
        Pre-Order & Save 10%
      </p>
      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
        Schedule delivery at least 1 day ahead and get 10% off food items — no coupon needed.
      </p>
      <Link
        href="/checkout"
        className="inline-block mt-2 text-xs font-semibold text-[#14532D] underline underline-offset-2"
        onClick={() => {
          setDeliveryTiming('scheduled');
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setScheduledDate(tomorrow.toISOString().slice(0, 10));
        }}
      >
        Schedule at checkout →
      </Link>
    </div>
  );
}
