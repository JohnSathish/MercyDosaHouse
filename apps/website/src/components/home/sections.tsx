'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { UtensilsCrossed, Leaf, Truck, Heart } from 'lucide-react';
import { FiStar, FiChevronDown } from 'react-icons/fi';
import { api } from '@/lib/api';
import { GALLERY_PREVIEW_ITEMS } from '@/lib/gallery-images';
import type { ReviewDto, ReviewSummaryDto } from '@mdh/types';

const WHY_ITEMS = [
  {
    icon: UtensilsCrossed,
    title: 'Freshly Prepared',
    desc: 'Made fresh for every order.',
  },
  {
    icon: Leaf,
    title: 'Quality Ingredients',
    desc: 'Carefully selected ingredients.',
  },
  {
    icon: Truck,
    title: 'Home Delivery',
    desc: 'Convenient delivery to your doorstep.',
  },
  {
    icon: Heart,
    title: 'Made With Love',
    desc: 'Fresh food prepared with care.',
  },
];

export function WhyChooseUsSection() {
  const items = WHY_ITEMS;

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-center text-2xl font-black text-[#0B542F] md:text-3xl">
          Why Choose Mercy Dosa House
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8E8] text-[#0B542F]">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1 font-bold text-[#18352A]">{item.title}</h3>
              <p className="text-sm text-[#18352A]/70">{item.desc}</p>
            </div>
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
  if (!list.length) return null;

  return (
    <section className="bg-[#FFF8E8] py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-3 text-center text-2xl font-black text-[#0B542F] md:text-3xl">
          What Our Customers Say
        </h2>
        {summary && summary.totalReviews > 0 ? (
          <p className="mb-10 text-center text-[#18352A]/70">
            {summary.averageRating}/5 · Based on {summary.totalReviews} customer reviews
          </p>
        ) : (
          <div className="mb-8" />
        )}
        <div className="grid gap-6 md:grid-cols-3">
          {list.slice(0, 3).map((t) => (
            <div key={t.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex gap-0.5 text-[#F5A000]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <FiStar
                    key={s}
                    className={`h-4 w-4 ${s <= t.rating ? 'fill-current' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <p className="mb-4 italic text-[#18352A]/80">
                {t.comment ? <>&ldquo;{t.comment}&rdquo;</> : 'Rated this order after delivery.'}
              </p>
              <p className="font-semibold text-[#0B542F]">— {t.customerName}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/reviews" className="font-semibold text-[#0B542F] underline">
            View all reviews
          </Link>
        </div>
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
                className="w-full bg-white/10 backdrop-blur rounded-2xl p-6 text-center min-w-0 md:min-w-[140px] card-lift"
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
