'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { Button, Card, CardContent } from '@mdh/ui';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { FeedbackConfigDto } from '@mdh/types';
import Link from 'next/link';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={checked ? 'default' : 'outline'}
        className={checked ? 'bg-[#0B3D24] hover:bg-[#0B3D24]/90 min-w-16' : 'min-w-16'}
        onClick={() => onChange(!checked)}
      >
        {checked ? 'ON' : 'OFF'}
      </Button>
    </div>
  );
}

export default function FeedbackSettingsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { data, isLoading } = useQuery({
    queryKey: ['settings-feedback'],
    queryFn: () => api.get<FeedbackConfigDto>('/settings/feedback'),
  });

  const save = useMutation({
    mutationFn: (body: Partial<FeedbackConfigDto>) =>
      api.patch<FeedbackConfigDto>('/settings/feedback', body),
    onSuccess: (next) => {
      qc.setQueryData(['settings-feedback'], next);
      qc.invalidateQueries({ queryKey: ['review-summary'] });
      toast('Feedback settings saved.');
    },
  });

  const cfg = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Feedback & Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control whether customers can rate orders and whether reviews appear publicly.
        </p>
      </div>

      {isLoading || !cfg ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {!cfg.enabled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Feedback is currently disabled for customers. Existing reviews stay in the database
              and remain available in the{' '}
              <Link href="/feedback" className="font-semibold underline">
                Feedback & Reviews
              </Link>{' '}
              panel.
            </div>
          ) : null}

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-[#14532D]" />
                <p className="font-semibold">Customer Feedback</p>
              </div>
              <ToggleRow
                label="Customer Feedback"
                description="Master switch. When off, Rate & Review is hidden and new submissions are rejected."
                checked={cfg.enabled}
                onChange={(enabled) => save.mutate({ enabled })}
              />
              <ToggleRow
                label="Allow Star Ratings"
                description="Let customers give a 1–5 star rating."
                checked={cfg.allowStarRatings}
                onChange={(allowStarRatings) => save.mutate({ allowStarRatings })}
              />
              <ToggleRow
                label="Allow Written Reviews"
                description="Optional comments. Stars can still be submitted if this is off."
                checked={cfg.allowWrittenReviews}
                onChange={(allowWrittenReviews) => save.mutate({ allowWrittenReviews })}
              />
              <ToggleRow
                label="Product Ratings"
                description="Allow rating individual dishes on a delivered order."
                checked={cfg.allowProductRatings}
                onChange={(allowProductRatings) => save.mutate({ allowProductRatings })}
              />
              <ToggleRow
                label="Show Reviews Publicly"
                description="Display verified reviews and the public rating on the website."
                checked={cfg.showReviewsPublicly}
                onChange={(showReviewsPublicly) => save.mutate({ showReviewsPublicly })}
              />
              <ToggleRow
                label="Allow Admin Replies"
                description="Let staff reply to customer feedback."
                checked={cfg.allowAdminReplies}
                onChange={(allowAdminReplies) => save.mutate({ allowAdminReplies })}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
