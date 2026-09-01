'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { FiTruck, FiShield, FiHeart, FiStar, FiCoffee, FiChevronDown } from 'react-icons/fi';
import { AnimatedCounter } from './hero-animated-counter';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import { getSectionContent } from '@/lib/cms-content';
import { BRAND } from '@mdh/utils';
import { api } from '@/lib/api';
import { GALLERY_PREVIEW_ITEMS } from '@/lib/gallery-images';
import type { ReviewDto, ReviewSummaryDto } from '@mdh/types';

const WHY_ITEMS = [
  {
    icon: FiShield,
    title: 'Hygienic Kitchen',
    desc: 'Clean, safe & certified food preparation',
  },
  { icon: FiTruck, title: 'On-Time Delivery', desc: 'Hot food at your door, on schedule' },
  { icon: FiCoffee, title: 'Quality Ingredients', desc: 'Prepared with premium ingredients' },
  { icon: FiHeart, title: 'Made with Love', desc: 'Traditional recipes from our kitchen' },
];

export function WhyChooseUsSection() {
  const cms = useCmsContent();
  const cmsItems = cms
    ? getSectionContent<{ items: { title: string; desc: string }[] }>(cms, 'home', 'whyChooseUs')
        ?.items
    : undefined;
  const mockTitles = new Set(WHY_ITEMS.map((item) => item.title.toLowerCase()));
  const cmsMatchesFour =
    cmsItems?.filter((item) => mockTitles.has(item.title.trim().toLowerCase())).length === 4
      ? cmsItems
          .filter((item) => mockTitles.has(item.title.trim().toLowerCase()))
          .slice(0, 4)
          .map((item) => {
            const fallback = WHY_ITEMS.find(
              (w) => w.title.toLowerCase() === item.title.trim().toLowerCase(),
            )!;
            return { ...fallback, title: item.title, desc: item.desc || fallback.desc };
          })
      : null;
  const items = cmsMatchesFour ?? WHY_ITEMS;

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-[#14532D] text-center mb-12">
          Why Choose {BRAND.name}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="text-center p-6 rounded-2xl bg-[#FFF8E8] border border-[#14532D]/5"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold text-[#1F2937] mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const { data: reviews } = useQuery({
    queryKey: ['public-reviews-home'],
    queryFn: () => api.get<ReviewDto[]>('/reviews?limit=6'),
    staleTime: 60_000,
  });
  const { data: summary } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => api.get<ReviewSummaryDto>('/reviews/summary'),
    staleTime: 60_000,
  });
  const list = reviews ?? [];

  return (
    <section className="py-16 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-[#14532D] text-center mb-3">
          What Our Customers Say
        </h2>
        {summary && summary.totalReviews > 0 ? (
          <p className="text-center text-gray-600 mb-10">
            {summary.averageRating}/5 · Based on {summary.totalReviews} customer reviews
          </p>
        ) : (
          <p className="text-center text-gray-600 mb-8">Verified reviews from delivered orders.</p>
        )}
        {list.length ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {list.slice(0, 3).map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 shadow-md card-lift"
                >
                  <div className="flex gap-0.5 text-secondary mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <FiStar
                        key={s}
                        className={`w-4 h-4 ${s <= t.rating ? 'fill-current' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 italic mb-4">
                    &ldquo;{t.comment || 'Great food and service.'}&rdquo;
                  </p>
                  <p className="font-semibold text-[#14532D]">— {t.customerName}</p>
                  {t.verified ? (
                    <p className="text-[11px] font-bold text-emerald-700 mt-1">✓ Verified Order</p>
                  ) : null}
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/reviews"
                className="text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] rounded"
              >
                View All Reviews
              </Link>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-[#14532D]/10 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-[#14532D]">Be our first reviewer</p>
            <p className="mt-2 text-sm text-gray-600">
              Share feedback after a delivered order — we only publish real customer reviews.
            </p>
            <Link
              href="/reviews"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F59E0B] px-5 text-sm font-bold text-[#1F2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D]"
            >
              Share Your Feedback
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function GalleryPreviewSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold text-[#14532D]">Gallery</h2>
          <Link href="/gallery" className="text-primary font-semibold hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[120px] md:auto-rows-[150px]">
          {GALLERY_PREVIEW_ITEMS.map((item) => (
            <Link
              key={item.title}
              href="/gallery"
              className={`relative rounded-xl overflow-hidden group ${item.span}`}
            >
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between">
                <span className="text-white text-sm font-semibold drop-shadow">{item.title}</span>
                <span className="text-white/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  View
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: 'Choose Food', icon: '🍽️' },
  { title: 'Place Order', icon: '📱' },
  { title: 'Cooking', icon: '👨‍🍳' },
  { title: 'Delivery', icon: '🚚' },
];

export function DeliveryStepsSection() {
  return (
    <section className="py-16 bg-[#14532D] text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col md:flex-row items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center min-w-[140px] card-lift"
              >
                <span className="text-3xl mb-2 block">{step.icon}</span>
                <p className="font-semibold">{step.title}</p>
              </motion.div>
              {i < STEPS.length - 1 && (
                <FiChevronDown className="w-6 h-6 text-secondary my-2 md:my-0 md:rotate-[-90deg] mx-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { value: 1000, suffix: '+', label: 'Orders Served' },
    { value: 4.9, suffix: '', label: 'Rating', isDecimal: true },
    { value: 100, suffix: '%', label: 'Fresh Ingredients' },
    { value: 20, suffix: ' min', label: 'Avg Delivery' },
  ];

  return (
    <section className="py-16 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-primary">
                {stat.isDecimal ? (
                  <>★ {stat.value}</>
                ) : (
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                )}
              </p>
              <p className="text-gray-600 mt-2 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
