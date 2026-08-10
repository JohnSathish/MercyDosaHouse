'use client';

import { motion } from 'framer-motion';
import { useMarketing } from '@/components/marketing/marketing-provider';

export function HomeBoldPromoBanner() {
  const marketing = useMarketing();
  const item =
    marketing?.byPlacement?.HOME_BOLD_BANNER?.[0] ??
    marketing?.announcements?.find((a) => a.placements?.includes('HOME_BOLD_BANNER'));

  if (!item?.message) return null;

  return (
    <section className="py-5 md:py-6 bg-[#FFF8E8] border-y-2 border-[#14532D]/15">
      <div className="container mx-auto px-4">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-base sm:text-lg md:text-xl font-bold text-[#14532D] leading-snug max-w-4xl mx-auto"
        >
          {item.message}
        </motion.p>
      </div>
    </section>
  );
}
