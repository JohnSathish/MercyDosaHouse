export type FeedbackConfig = {
  enabled: boolean;
  allowStarRatings: boolean;
  allowWrittenReviews: boolean;
  allowProductRatings: boolean;
  showReviewsPublicly: boolean;
  allowAdminReplies: boolean;
};

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  enabled: true,
  allowStarRatings: true,
  allowWrittenReviews: true,
  allowProductRatings: true,
  showReviewsPublicly: true,
  allowAdminReplies: true,
};

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

export function parseFeedbackConfig(raw: unknown): FeedbackConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    enabled: bool(o.enabled ?? o.customerFeedback, DEFAULT_FEEDBACK_CONFIG.enabled),
    allowStarRatings: bool(o.allowStarRatings, DEFAULT_FEEDBACK_CONFIG.allowStarRatings),
    allowWrittenReviews: bool(o.allowWrittenReviews, DEFAULT_FEEDBACK_CONFIG.allowWrittenReviews),
    allowProductRatings: bool(o.allowProductRatings, DEFAULT_FEEDBACK_CONFIG.allowProductRatings),
    showReviewsPublicly: bool(o.showReviewsPublicly, DEFAULT_FEEDBACK_CONFIG.showReviewsPublicly),
    allowAdminReplies: bool(o.allowAdminReplies, DEFAULT_FEEDBACK_CONFIG.allowAdminReplies),
  };
}
