export const REVIEW_LIKES = [
  'FOOD_QUALITY',
  'TASTE',
  'PACKAGING',
  'DELIVERY',
  'PORTION',
  'VALUE',
] as const;

export const REVIEW_ISSUES = [
  'FOOD_QUALITY',
  'TASTE',
  'DELIVERY_DELAY',
  'MISSING_ITEM',
  'WRONG_ITEM',
  'PACKAGING',
  'PRICING',
  'OTHER',
] as const;

export type ReviewLikeKey = (typeof REVIEW_LIKES)[number];
export type ReviewIssueKey = (typeof REVIEW_ISSUES)[number];
export type ReviewVisibility = 'VISIBLE' | 'HIDDEN' | 'DELETED';

export interface ReviewItemDto {
  id: string;
  orderItemId?: string | null;
  productId: string;
  productName: string;
  rating: number;
}

export interface ReviewModerationLogDto {
  id: string;
  adminName?: string | null;
  action: string;
  reason?: string | null;
  createdAt: string;
}

export interface ReviewDto {
  id: string;
  orderId?: string | null;
  orderNumber?: string | null;
  rating: number;
  comment?: string | null;
  likes: string[];
  issues: string[];
  visibility: ReviewVisibility;
  flagged: boolean;
  needsAttention: boolean;
  verified: boolean;
  customerName: string;
  ownerReply?: string | null;
  ownerRepliedAt?: string | null;
  adminReviewedAt?: string | null;
  items: ReviewItemDto[];
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  moderationLogs?: ReviewModerationLogDto[];
}

export interface ReviewSummaryDto {
  averageRating: number;
  totalReviews: number;
  publishedReviews: number;
  hiddenReviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  categoryAverages: { key: string; label: string; average: number; count: number }[];
}

export interface FeedbackConfigDto {
  enabled: boolean;
  allowStarRatings: boolean;
  allowWrittenReviews: boolean;
  allowProductRatings: boolean;
  showReviewsPublicly: boolean;
  allowAdminReplies: boolean;
}

export interface CreateReviewRequest {
  orderId: string;
  rating: number;
  comment?: string;
  likes?: string[];
  issues?: string[];
  items?: { orderItemId?: string; productId?: string; rating: number }[];
}
