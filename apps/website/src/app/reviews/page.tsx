'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FiStar } from 'react-icons/fi';
import { api } from '@/lib/api';
import type { ReviewDto, ReviewSummaryDto } from '@mdh/types';

export default function ReviewsPage() {
  const { data: summary } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => api.get<ReviewSummaryDto>('/reviews/summary'),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['public-reviews-all'],
    queryFn: () => api.get<ReviewDto[]>('/reviews?limit=50'),
  });

  return (
    <div className="pt-4 lg:pt-24 pb-16 container mx-auto px-4">
      <h1 className="text-3xl font-bold text-[#14532D] mb-2">Customer Reviews</h1>
      {summary && summary.totalReviews > 0 ? (
        <p className="text-gray-600 mb-8">
          ⭐ {summary.averageRating}/5 based on {summary.totalReviews} verified customer reviews
        </p>
      ) : (
        <p className="text-gray-600 mb-8">
          Verified reviews from delivered orders will appear here.
        </p>
      )}
      <div className="space-y-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <FiStar
                  key={s}
                  className={`w-4 h-4 ${s <= review.rating ? 'text-[#F59E0B] fill-current' : 'text-gray-200'}`}
                />
              ))}
              {review.verified ? (
                <span className="text-[11px] font-bold text-emerald-700">✓ Verified Order</span>
              ) : null}
            </div>
            {review.comment ? <p className="text-gray-700">{review.comment}</p> : null}
            <p className="text-sm font-semibold text-[#14532D] mt-3">— {review.customerName}</p>
          </article>
        ))}
      </div>
      <Link href="/menu" className="inline-block mt-8 text-primary font-semibold">
        ← Back to menu
      </Link>
    </div>
  );
}
