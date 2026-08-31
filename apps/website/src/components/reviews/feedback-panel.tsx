'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReviewDto } from '@mdh/types';
import { Card, CardContent } from '@mdh/ui';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/dashboard/empty-state';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#F59E0B] tracking-tight" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}
      <span className="text-gray-200">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

export function FeedbackPanel() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get<ReviewDto[]>('/reviews/mine'),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading your feedback…</p>;
  if (!reviews.length) {
    return (
      <EmptyState
        emoji="⭐"
        title="No feedback yet"
        description="Rate a delivered order to help us serve you better."
        actionLabel="View Orders"
        actionHref="/profile?tab=orders"
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Card key={review.id} className="rounded-2xl shadow-md border-0">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Stars rating={review.rating} />
              {review.verified ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✓ Verified Order
                </span>
              ) : null}
            </div>
            {review.orderNumber ? (
              <p className="text-xs text-gray-400">Order #{review.orderNumber}</p>
            ) : null}
            {review.comment ? (
              <p className="text-sm text-gray-700">&ldquo;{review.comment}&rdquo;</p>
            ) : null}
            {review.items.length ? (
              <p className="text-xs text-gray-500">
                {review.items.map((i) => `${i.productName} (${i.rating}★)`).join(' · ')}
              </p>
            ) : null}
            {review.ownerReply ? (
              <div className="rounded-xl bg-[#FFF8E8] p-3">
                <p className="text-xs font-bold text-[#14532D]">Mercy Dosa House</p>
                <p className="text-sm text-gray-700 mt-1">{review.ownerReply}</p>
              </div>
            ) : null}
            {review.orderId ? (
              <Link
                href={`/track/${review.orderNumber}`}
                className="text-xs font-semibold text-primary"
              >
                View order
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
