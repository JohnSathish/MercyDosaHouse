'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { FeedbackConfigDto, ReviewDto, ReviewSummaryDto } from '@mdh/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'visible', label: 'Visible' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'attention', label: 'Needs Attention' },
  { id: '5', label: '5 Star' },
  { id: '4', label: '4 Star' },
  { id: '3', label: '3 Star' },
  { id: '2', label: '2 Star' },
  { id: '1', label: '1 Star' },
] as const;

export default function FeedbackAdminPage() {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [search, setSearch] = useState('');
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);
  const [hideTarget, setHideTarget] = useState<ReviewDto | null>(null);
  const [hideReason, setHideReason] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (['1', '2', '3', '4', '5'].includes(filter)) params.set('rating', filter);
    else if (filter !== 'all') params.set('filter', filter);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [filter, search]);

  const { data: config } = useQuery({
    queryKey: ['settings-feedback'],
    queryFn: () => api.get<FeedbackConfigDto>('/settings/feedback'),
  });
  const { data: summary } = useQuery({
    queryKey: ['admin-review-stats'],
    queryFn: () => api.get<ReviewSummaryDto>('/reviews/admin/stats'),
  });
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews', query],
    queryFn: () => api.get<ReviewDto[]>(`/reviews/admin${query ? `?${query}` : ''}`),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, ownerReply }: { id: string; ownerReply: string }) =>
      api.patch(`/reviews/${id}/reply`, { ownerReply }),
    onSuccess: () => {
      toast('Reply sent.');
      setReplyFor(null);
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const moderateMut = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      api.patch(`/reviews/${id}/moderate`, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      qc.invalidateQueries({ queryKey: ['admin-review-stats'] });
      setHideTarget(null);
      setHideReason('');
    },
  });

  const viewing = reviews.find((r) => r.id === viewId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Feedback & Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hide or show individual reviews without deleting customer data.
          </p>
        </div>
        <Link href="/settings/feedback" className="text-sm font-semibold text-[#14532D]">
          Feedback settings →
        </Link>
      </div>

      {config && !config.enabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Feedback is currently disabled for customers. Existing reviews below are unchanged.
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Public Rating</p>
            <p className="text-2xl font-bold text-[#14532D]">★ {summary?.averageRating ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Feedback</p>
            <p className="text-2xl font-bold">{summary?.totalReviews ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Published Feedback</p>
            <p className="text-2xl font-bold">{summary?.publishedReviews ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hidden Feedback</p>
            <p className="text-2xl font-bold">{summary?.hiddenReviews ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-1 text-sm">
          {([5, 4, 3, 2, 1] as const).map((n) => (
            <p key={n}>
              {n} ⭐ {summary?.breakdown[n] ?? 0}
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
              filter === f.id
                ? 'bg-[#14532D] text-white border-[#14532D]'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Input
        placeholder="Search customer, order number, product, or feedback text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-[#FFF8E8] text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Customer</th>
              <th className="px-3 py-2 font-semibold">Rating</th>
              <th className="px-3 py-2 font-semibold">Feedback</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : null}
            {reviews.map((review) => (
              <tr key={review.id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-3">
                  <p className="font-semibold">{review.customerName}</p>
                  <p className="text-xs text-gray-400">#{review.orderNumber}</p>
                </td>
                <td className="px-3 py-3 text-[#F59E0B] whitespace-nowrap">
                  {'★'.repeat(review.rating)}
                </td>
                <td className="px-3 py-3 max-w-xs">
                  <p className="line-clamp-2">{review.comment || '—'}</p>
                  {review.items[0] ? (
                    <p className="text-xs text-gray-400 mt-1">
                      {review.items.map((i) => i.productName).join(', ')}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  {review.visibility === 'HIDDEN' ? (
                    <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      🚫 Hidden
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      👁 Visible
                    </span>
                  )}
                  {review.needsAttention ? (
                    <p className="text-[11px] font-bold text-amber-700 mt-1">Needs Attention</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {review.visibility === 'VISIBLE' ? (
                      <Button size="sm" variant="outline" onClick={() => setHideTarget(review)}>
                        Hide
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moderateMut.mutate({ id: review.id, action: 'restore' })}
                      >
                        Show
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setViewId(review.id)}>
                      View
                    </Button>
                    {config?.allowAdminReplies !== false ? (
                      <Button size="sm" variant="outline" onClick={() => setReplyFor(review.id)}>
                        Reply
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        moderateMut.mutate({
                          id: review.id,
                          action: review.flagged ? 'unflag' : 'flag',
                        })
                      }
                    >
                      {review.flagged ? 'Unflag' : 'Flag'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !reviews.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted-foreground">
                  No reviews match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {replyFor ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold">Reply</p>
            <textarea
              className="w-full border rounded-xl p-2 text-sm min-h-20"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank you so much for your wonderful feedback! ❤️"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#14532D]"
                onClick={() => replyMut.mutate({ id: replyFor, ownerReply: replyText })}
              >
                Send reply
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReplyFor(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between">
                <p className="font-bold">{viewing.customerName}</p>
                <button type="button" onClick={() => setViewId(null)}>
                  Close
                </button>
              </div>
              <p className="text-[#F59E0B]">{'★'.repeat(viewing.rating)}</p>
              <p>{viewing.comment || 'No written feedback.'}</p>
              <p className="text-xs text-gray-400">
                Order #{viewing.orderNumber} · {new Date(viewing.createdAt).toLocaleString()}
              </p>
              {viewing.orderId ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/orders?orderId=${viewing.orderId}`)}
                >
                  View Order
                </Button>
              ) : null}
              {viewing.moderationLogs?.length ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-semibold">Audit trail</p>
                  {viewing.moderationLogs.map((log) => (
                    <p key={log.id} className="text-xs text-gray-600">
                      {log.action} by {log.adminName || 'Admin'} on{' '}
                      {new Date(log.createdAt).toLocaleString()}
                      {log.reason ? ` — ${log.reason}` : ''}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No moderation history yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {hideTarget ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-5 space-y-3">
              <p className="font-bold">Hide this feedback?</p>
              <p className="text-sm text-gray-600">
                This feedback will no longer be displayed publicly, but it will remain available in
                the Admin Panel.
              </p>
              <Input
                placeholder="Optional reason (e.g. Inappropriate content)"
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="bg-[#14532D]"
                  onClick={() =>
                    moderateMut.mutate({
                      id: hideTarget.id,
                      action: 'hide',
                      reason: hideReason || undefined,
                    })
                  }
                >
                  Hide feedback
                </Button>
                <Button variant="outline" onClick={() => setHideTarget(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
