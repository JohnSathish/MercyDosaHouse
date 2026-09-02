'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  REVIEW_ISSUES,
  REVIEW_LIKES,
  type CreateReviewRequest,
  type FeedbackConfigDto,
  type OrderDto,
  type ReviewDto,
} from '@mdh/types';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';

const COMMENT_MAX = 1000;

const LIKE_OPTIONS: { key: (typeof REVIEW_LIKES)[number]; label: string }[] = [
  { key: 'FOOD_QUALITY', label: 'Food Quality' },
  { key: 'TASTE', label: 'Taste' },
  { key: 'PACKAGING', label: 'Packaging' },
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'PORTION', label: 'Portion Size' },
  { key: 'VALUE', label: 'Value for Money' },
];

const ISSUE_OPTIONS: { key: (typeof REVIEW_ISSUES)[number]; label: string }[] = [
  { key: 'FOOD_QUALITY', label: 'Food quality' },
  { key: 'TASTE', label: 'Taste' },
  { key: 'DELIVERY_DELAY', label: 'Delivery delay' },
  { key: 'MISSING_ITEM', label: 'Missing item' },
  { key: 'WRONG_ITEM', label: 'Wrong item' },
  { key: 'PACKAGING', label: 'Packaging' },
  { key: 'PRICING', label: 'Pricing' },
  { key: 'OTHER', label: 'Other' },
];

export function StarPicker({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (n: number) => void;
  size?: 'sm' | 'lg';
}) {
  const cls = size === 'lg' ? 'text-3xl min-w-11 min-h-11' : 'text-xl min-w-8 min-h-8';
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className={`${cls} touch-manipulation rounded-full ${n <= value ? 'text-[#F59E0B]' : 'text-gray-300'}`}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  order,
  existing,
  onDone,
  config,
}: {
  order: OrderDto;
  existing?: ReviewDto | null;
  onDone?: () => void;
  config?: {
    allowWrittenReviews?: boolean;
    allowProductRatings?: boolean;
    allowStarRatings?: boolean;
  };
}) {
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [likes, setLikes] = useState<string[]>(existing?.likes ?? []);
  const [issues, setIssues] = useState<string[]>(existing?.issues ?? []);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const item of existing?.items ?? []) {
      if (item.orderItemId) next[item.orderItemId] = item.rating;
    }
    return next;
  });
  const remaining = COMMENT_MAX - comment.length;

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return order.items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [order.items]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateReviewRequest = {
        orderId: order.id,
        rating,
        comment: comment.trim() || undefined,
        likes,
        issues: rating <= 2 ? issues : [],
        items: uniqueItems
          .filter((item) => itemRatings[item.id])
          .map((item) => ({
            orderItemId: item.id,
            productId: item.productId,
            rating: itemRatings[item.id],
          })),
      };
      if (existing?.id) return api.patch<ReviewDto>(`/reviews/${existing.id}`, payload);
      return api.post<ReviewDto>('/reviews', payload);
    },
    onSuccess: () => {
      toast(
        existing
          ? 'Your review was updated.'
          : 'Thank you for your feedback! ❤️ We appreciate your support of Mercy Dosa House.',
      );
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['review-order', order.id] });
      qc.invalidateQueries({ queryKey: ['review-summary'] });
      onDone?.();
    },
    onError: (err: Error) => toast(err.message || 'Could not submit review'),
  });

  const toggle = (list: string[], key: string, set: (v: string[]) => void) => {
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-bold text-[#14532D]">How was your experience?</p>
        <p className="text-sm text-gray-500">Your feedback helps us serve you better. ❤️</p>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">Rate your order</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      {rating > 0 && rating <= 2 ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <p className="text-sm font-semibold text-[#14532D]">
            We&apos;re sorry your experience wasn&apos;t perfect. 💚
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Please tell us what went wrong so we can improve.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {ISSUE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggle(issues, opt.key, setIssues)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                  issues.includes(opt.key)
                    ? 'bg-[#14532D] text-white border-[#14532D]'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold mb-2">What did you like?</p>
        <div className="flex flex-wrap gap-2">
          {LIKE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(likes, opt.key, setLikes)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                likes.includes(opt.key)
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {config?.allowProductRatings !== false && uniqueItems.length ? (
        <div>
          <p className="text-sm font-semibold mb-2">Rate individual items (optional)</p>
          <div className="space-y-2">
            {uniqueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <p className="text-sm truncate">{item.productName}</p>
                <StarPicker
                  size="sm"
                  value={itemRatings[item.id] ?? 0}
                  onChange={(n) => setItemRatings((prev) => ({ ...prev, [item.id]: n }))}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {config?.allowWrittenReviews !== false ? (
        <div>
          <label className="text-sm font-semibold" htmlFor={`review-${order.id}`}>
            Tell us about your experience
          </label>
          <textarea
            id={`review-${order.id}`}
            value={comment}
            maxLength={COMMENT_MAX}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the food, delivery, packaging, and overall experience?"
            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm min-h-28"
          />
          <p className="text-xs text-gray-400 text-right">{remaining} characters left</p>
        </div>
      ) : null}

      <Button
        className="w-full bg-[#14532D] min-h-12"
        disabled={rating < 1 || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Submitting…' : existing ? 'Update Feedback' : 'Submit Feedback'}
      </Button>
    </div>
  );
}

export function RateOrderButton({ order }: { order: OrderDto }) {
  const [open, setOpen] = useState(false);
  const { data: config } = useQuery({
    queryKey: ['settings-feedback'],
    queryFn: () => api.get<FeedbackConfigDto>('/settings/feedback'),
    staleTime: 60_000,
  });
  const { data: existing } = useQuery({
    queryKey: ['review-order', order.id],
    queryFn: () => api.get<ReviewDto | null>(`/reviews/order/${order.id}`),
    enabled: open || Boolean(order.reviewId),
  });

  if (order.status !== 'DELIVERED') return null;
  if (config && !config.enabled) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="w-full md:w-auto"
        onClick={() => setOpen(true)}
      >
        {order.reviewId || existing ? 'Edit Review' : 'Rate & Review'}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="font-bold text-[#14532D]">Order #{order.orderNumber}</p>
              <button type="button" className="text-gray-500" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <ReviewForm
              order={order}
              existing={existing}
              config={config}
              onDone={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
