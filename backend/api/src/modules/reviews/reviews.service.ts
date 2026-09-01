import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivitySeverity,
  NotificationType,
  OrderStatus,
  Prisma,
  ReviewVisibility,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import {
  REVIEW_ISSUES,
  REVIEW_LIKES,
  type CreateReviewRequest,
  type ReviewDto,
  type ReviewSummaryDto,
} from '@mdh/types';

const COMMENT_MAX = 1000;
const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const LIKE_LABELS: Record<string, string> = {
  FOOD_QUALITY: 'Food Quality',
  TASTE: 'Taste',
  PACKAGING: 'Packaging',
  DELIVERY: 'Delivery',
  PORTION: 'Portion Size',
  VALUE: 'Value for Money',
  OVERALL: 'Overall experience',
};

type ReviewRecord = Prisma.ReviewGetPayload<{
  include: {
    user: { select: { name: true; phone: true } };
    order: { select: { orderNumber: true; status: true } };
    items: true;
    moderationLogs: true;
  };
}>;

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private settings: SettingsService,
    private audit: AuditService,
  ) {}

  async create(userId: string, body: CreateReviewRequest) {
    const config = await this.settings.getFeedbackConfig();
    if (!config.enabled) {
      throw new ForbiddenException('Customer feedback is currently disabled');
    }
    if (!config.allowStarRatings) {
      throw new ForbiddenException('Star ratings are currently disabled');
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) throw new BadRequestException('Order is required');
    const rating = this.assertRating(body.rating);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, review: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only review your own orders');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Reviews are only allowed for delivered orders');
    }
    if (order.review) {
      throw new BadRequestException('This order already has a review');
    }

    const likes = this.filterKeys(body.likes, REVIEW_LIKES);
    const issues = this.filterKeys(body.issues, REVIEW_ISSUES);
    const comment = config.allowWrittenReviews ? this.sanitizeComment(body.comment) : null;
    const items = config.allowProductRatings ? await this.buildItems(order.items, body.items) : [];
    const needsAttention = rating <= 2;

    const review = await this.prisma.review.create({
      data: {
        orderId: order.id,
        userId,
        productId: items[0]?.productId ?? order.items[0]?.productId ?? null,
        rating,
        comment,
        likes,
        issues,
        photos: [],
        needsAttention,
        items: { create: items },
      },
      include: this.include(),
    });

    const customerName = review.user?.name || 'A customer';
    const pid = review.productId ?? order.items[0]?.productId;
    const firstProduct = pid
      ? await this.prisma.product.findUnique({ where: { id: pid }, select: { name: true } })
      : null;
    const productName = firstProduct?.name || 'their order';
    void this.notifications.emitStaffInbox({
      eventKey: `REVIEW:${review.id}:NEW`,
      type: NotificationType.REVIEW,
      category: 'CUSTOMER',
      priority: rating <= 2 ? 'HIGH' : 'NORMAL',
      title:
        rating <= 2
          ? '⚠️ Negative feedback'
          : rating === 5
            ? '⭐ New 5-star review'
            : '⭐ New customer feedback',
      body:
        rating === 5
          ? `${customerName} rated ${productName} 5 stars.`
          : `${customerName} left a ${rating}-star review.`,
      referenceType: 'REVIEW',
      referenceId: review.id,
      metadata: { reviewId: review.id, orderId: order.id, rating },
    });

    return this.toDto(review, { viewerId: userId, publicName: false });
  }

  async updateMine(userId: string, id: string, body: Partial<CreateReviewRequest>) {
    const config = await this.settings.getFeedbackConfig();
    if (!config.enabled) {
      throw new ForbiddenException('Customer feedback is currently disabled');
    }
    const existing = await this.prisma.review.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
    if (!existing || existing.visibility === ReviewVisibility.DELETED) {
      throw new NotFoundException('Review not found');
    }
    if (existing.userId !== userId) throw new ForbiddenException('Not your review');
    if (!this.canEdit(existing.createdAt)) {
      throw new BadRequestException('The editing window for this review has closed');
    }

    const rating = body.rating != null ? this.assertRating(body.rating) : existing.rating;
    if (body.rating != null && !config.allowStarRatings) {
      throw new ForbiddenException('Star ratings are currently disabled');
    }
    const likes = body.likes ? this.filterKeys(body.likes, REVIEW_LIKES) : existing.likes;
    const issues = body.issues ? this.filterKeys(body.issues, REVIEW_ISSUES) : existing.issues;
    const comment = !config.allowWrittenReviews
      ? existing.comment
      : body.comment !== undefined
        ? this.sanitizeComment(body.comment)
        : existing.comment;
    const items =
      body.items && config.allowProductRatings
        ? await this.buildItems(existing.order?.items ?? [], body.items)
        : null;

    const review = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.reviewItem.deleteMany({ where: { reviewId: id } });
        await tx.reviewItem.createMany({
          data: items.map((item) => ({ ...item, reviewId: id })),
        });
      }
      return tx.review.update({
        where: { id },
        data: {
          rating,
          comment,
          likes,
          issues,
          needsAttention: rating <= 2,
          productId: items?.[0]?.productId ?? existing.productId,
        },
        include: this.include(),
      });
    });

    return this.toDto(review, { viewerId: userId, publicName: false });
  }

  async findMine(userId: string) {
    const rows = await this.prisma.review.findMany({
      where: { userId, visibility: { not: ReviewVisibility.DELETED } },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r, { viewerId: userId, publicName: false }));
  }

  async findForOrder(userId: string, orderId: string) {
    const review = await this.prisma.review.findFirst({
      where: { orderId, userId, visibility: { not: ReviewVisibility.DELETED } },
      include: this.include(),
    });
    return review ? this.toDto(review, { viewerId: userId, publicName: false }) : null;
  }

  async publicList(opts: { productId?: string; limit?: number }) {
    const config = await this.settings.getFeedbackConfig();
    if (!config.showReviewsPublicly) return [];
    const take = Math.min(Math.max(opts.limit ?? 24, 1), 50);
    const itemFilter = opts.productId ? { some: { productId: opts.productId } } : undefined;
    const rows = await this.prisma.review.findMany({
      where: {
        visibility: ReviewVisibility.VISIBLE,
        orderId: { not: null },
        ...(opts.productId
          ? { OR: [{ productId: opts.productId }, { items: itemFilter }] }
          : {
              rating: { gte: 4 },
              comment: { not: null },
            }),
      },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows
      .filter((r) => (opts.productId ? true : (r.comment ?? '').trim().length >= 8))
      .map((r) => this.toDto(r, { publicName: true }));
  }

  async summary(productId?: string, opts?: { admin?: boolean }): Promise<ReviewSummaryDto> {
    const config = await this.settings.getFeedbackConfig();
    if (!opts?.admin && !config.showReviewsPublicly) {
      return this.emptySummary();
    }

    const publishedWhere: Prisma.ReviewWhereInput = {
      visibility: ReviewVisibility.VISIBLE,
      orderId: { not: null },
      ...(productId ? { OR: [{ productId }, { items: { some: { productId } } }] } : {}),
    };
    const hiddenWhere: Prisma.ReviewWhereInput = {
      visibility: ReviewVisibility.HIDDEN,
      orderId: { not: null },
      ...(productId ? { OR: [{ productId }, { items: { some: { productId } } }] } : {}),
    };
    const [grouped, reviews, hiddenCount] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['rating'],
        where: publishedWhere,
        _count: { _all: true },
      }),
      this.prisma.review.findMany({
        where: publishedWhere,
        select: { rating: true, likes: true, issues: true },
      }),
      this.prisma.review.count({ where: hiddenWhere }),
    ]);

    const breakdown: ReviewSummaryDto['breakdown'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of grouped) {
      const key = row.rating as 1 | 2 | 3 | 4 | 5;
      if (key >= 1 && key <= 5) {
        breakdown[key] = row._count._all;
        total += row._count._all;
        sum += row.rating * row._count._all;
      }
    }

    const buckets = new Map<string, { sum: number; count: number }>();
    const bump = (key: string, value: number) => {
      const cur = buckets.get(key) ?? { sum: 0, count: 0 };
      cur.sum += value;
      cur.count += 1;
      buckets.set(key, cur);
    };
    for (const r of reviews) {
      bump('OVERALL', r.rating);
      for (const like of r.likes) bump(like, r.rating);
      for (const issue of r.issues) bump(issue, Math.min(r.rating, 2));
    }

    const categoryAverages = ['OVERALL', ...REVIEW_LIKES].map((key) => {
      const b = buckets.get(key);
      return {
        key,
        label: LIKE_LABELS[key] ?? key,
        average: b?.count ? Number((b.sum / b.count).toFixed(1)) : 0,
        count: b?.count ?? 0,
      };
    });

    return {
      averageRating: total ? Number((sum / total).toFixed(1)) : 0,
      totalReviews: opts?.admin ? total + hiddenCount : total,
      publishedReviews: total,
      hiddenReviews: opts?.admin ? hiddenCount : 0,
      breakdown,
      categoryAverages,
    };
  }

  async adminList(query: {
    rating?: string;
    filter?: string;
    productId?: string;
    search?: string;
  }) {
    const where: Prisma.ReviewWhereInput = {
      visibility: { not: ReviewVisibility.DELETED },
    };
    const rating = Number(query.rating);
    if (rating >= 1 && rating <= 5) where.rating = rating;

    if (query.filter === 'unreplied') where.ownerReply = null;
    if (query.filter === 'replied') where.ownerReply = { not: null };
    if (query.filter === 'attention') where.needsAttention = true;
    if (query.filter === 'flagged') where.flagged = true;
    if (query.filter === 'hidden') where.visibility = ReviewVisibility.HIDDEN;
    if (query.filter === 'visible') where.visibility = ReviewVisibility.VISIBLE;
    if (query.productId) {
      where.OR = [
        { productId: query.productId },
        { items: { some: { productId: query.productId } } },
      ];
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { comment: { contains: q, mode: 'insensitive' } },
            { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
          ],
        },
      ];
    }

    const rows = await this.prisma.review.findMany({
      where,
      include: this.include(),
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.toDto(r, { publicName: false, admin: true }));
  }

  async reply(adminId: string, id: string, ownerReply: string, adminName?: string | null) {
    const config = await this.settings.getFeedbackConfig();
    if (!config.allowAdminReplies) {
      throw new ForbiddenException('Admin replies are currently disabled');
    }
    const text = this.sanitizeComment(ownerReply);
    if (!text) throw new BadRequestException('Reply cannot be empty');
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing || existing.visibility === ReviewVisibility.DELETED) {
      throw new NotFoundException('Review not found');
    }

    const review = await this.prisma.review.update({
      where: { id },
      data: {
        ownerReply: text,
        ownerRepliedAt: new Date(),
        ownerRepliedById: adminId,
      },
      include: this.include(),
    });

    await this.recordModeration(id, adminId, adminName, 'reply', null);

    await this.notifications.create({
      userId: existing.userId,
      type: NotificationType.REVIEW_REPLY,
      title: 'Mercy Dosa House replied to your review',
      body: text.slice(0, 140),
      data: { reviewId: id, type: 'REVIEW_REPLY' },
    });

    return this.toDto(review, { admin: true });
  }

  async moderate(
    id: string,
    action: 'hide' | 'restore' | 'flag' | 'unflag' | 'reviewed' | 'delete',
    admin?: { id: string; name?: string | null },
    reason?: string | null,
  ) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Review not found');

    const data: Prisma.ReviewUpdateInput = {};
    if (action === 'hide') data.visibility = ReviewVisibility.HIDDEN;
    if (action === 'restore') data.visibility = ReviewVisibility.VISIBLE;
    if (action === 'flag') data.flagged = true;
    if (action === 'unflag') data.flagged = false;
    if (action === 'reviewed') data.adminReviewedAt = new Date();
    if (action === 'delete') data.visibility = ReviewVisibility.DELETED;

    const review = await this.prisma.review.update({
      where: { id },
      data,
      include: this.include(),
    });

    if (admin?.id) {
      await this.recordModeration(id, admin.id, admin.name, action, reason);
      await this.audit.log({
        userId: admin.id,
        userName: admin.name ?? undefined,
        action: action === 'restore' ? 'SHOW_REVIEW' : action.toUpperCase(),
        entity: 'Review',
        entityId: id,
        description: `${action} review ${id}${reason ? `: ${reason}` : ''}`,
        severity:
          action === 'hide' || action === 'delete'
            ? ActivitySeverity.WARNING
            : ActivitySeverity.INFO,
        metadata: { reason: reason ?? null, visibility: review.visibility },
      });
    }

    return this.toDto(review, { admin: true });
  }

  private async recordModeration(
    reviewId: string,
    adminId: string,
    adminName: string | null | undefined,
    action: string,
    reason?: string | null,
  ) {
    await this.prisma.reviewModerationLog.create({
      data: {
        reviewId,
        adminId,
        adminName: adminName ?? null,
        action,
        reason: reason?.trim() || null,
      },
    });
  }

  private emptySummary(): ReviewSummaryDto {
    return {
      averageRating: 0,
      totalReviews: 0,
      publishedReviews: 0,
      hiddenReviews: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoryAverages: [],
    };
  }

  private include() {
    return {
      user: { select: { name: true, phone: true } },
      order: { select: { orderNumber: true, status: true } },
      items: true,
      moderationLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    } as const;
  }

  private canEdit(createdAt: Date) {
    return Date.now() - createdAt.getTime() <= EDIT_WINDOW_MS;
  }

  private assertRating(value: unknown) {
    const rating = Number(value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be a whole number from 1 to 5');
    }
    return rating;
  }

  private sanitizeComment(value?: string | null) {
    if (value == null) return null;
    const cleaned = value
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return null;
    return cleaned.slice(0, COMMENT_MAX);
  }

  private filterKeys(values: unknown, allowed: readonly string[]) {
    if (!Array.isArray(values)) return [] as string[];
    const set = new Set(allowed);
    return [...new Set(values.map((v) => String(v)).filter((v) => set.has(v)))];
  }

  private async buildItems(
    orderItems: { id: string; productId: string; productName: string }[],
    incoming?: CreateReviewRequest['items'],
  ) {
    if (!incoming?.length) return [];
    const byId = new Map(orderItems.map((i) => [i.id, i]));
    const byProduct = new Map(orderItems.map((i) => [i.productId, i]));
    const out: {
      orderItemId: string | null;
      productId: string;
      productName: string;
      rating: number;
    }[] = [];

    for (const item of incoming) {
      const rating = this.assertRating(item.rating);
      const match =
        (item.orderItemId ? byId.get(item.orderItemId) : undefined) ??
        (item.productId ? byProduct.get(item.productId) : undefined);
      if (!match) continue;
      out.push({
        orderItemId: match.id,
        productId: match.productId,
        productName: match.productName,
        rating,
      });
    }
    return out;
  }

  private displayName(name: string | null, publicName: boolean) {
    const raw = (name || 'Customer').trim();
    if (!publicName) return raw;
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]!.toUpperCase()}.`;
  }

  private toDto(
    review: ReviewRecord,
    opts: { viewerId?: string; publicName?: boolean; admin?: boolean } = {},
  ): ReviewDto {
    const verified = review.order?.status === OrderStatus.DELIVERED && !!review.orderId;
    return {
      id: review.id,
      orderId: review.orderId,
      orderNumber: review.order?.orderNumber ?? null,
      rating: review.rating,
      comment: review.comment,
      likes: review.likes,
      issues: review.issues,
      visibility: review.visibility,
      flagged: review.flagged,
      needsAttention: review.needsAttention,
      verified,
      customerName: this.displayName(review.user.name, opts.publicName !== false && !opts.admin),
      ownerReply: review.ownerReply,
      ownerRepliedAt: review.ownerRepliedAt?.toISOString() ?? null,
      adminReviewedAt: review.adminReviewedAt?.toISOString() ?? null,
      items: review.items.map((i) => ({
        id: i.id,
        orderItemId: i.orderItemId,
        productId: i.productId,
        productName: i.productName,
        rating: i.rating,
      })),
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      canEdit: opts.viewerId === review.userId && this.canEdit(review.createdAt),
      moderationLogs: opts.admin
        ? (review.moderationLogs ?? []).map((log) => ({
            id: log.id,
            adminName: log.adminName,
            action: log.action,
            reason: log.reason,
            createdAt: log.createdAt.toISOString(),
          }))
        : undefined,
    };
  }
}
