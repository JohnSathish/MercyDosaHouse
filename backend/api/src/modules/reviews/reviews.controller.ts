import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';
import type { CreateReviewRequest } from '@mdh/types';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get('summary')
  summary(@Query('productId') productId?: string) {
    return this.reviewsService.summary(productId);
  }

  @Public()
  @Get()
  findPublic(@Query('productId') productId?: string, @Query('limit') limit?: string) {
    return this.reviewsService.publicList({
      productId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiBearerAuth()
  @Get('mine')
  mine(@Req() req: { user: RequestUser }) {
    return this.reviewsService.findMine(req.user.id);
  }

  @ApiBearerAuth()
  @Get('order/:orderId')
  forOrder(@Req() req: { user: RequestUser }, @Param('orderId') orderId: string) {
    return this.reviewsService.findForOrder(req.user.id, orderId);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.read')
  @Get('admin/stats')
  adminStats(@Query('productId') productId?: string) {
    return this.reviewsService.summary(productId, { admin: true });
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.read')
  @Get('admin')
  adminList(
    @Query('rating') rating?: string,
    @Query('filter') filter?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
  ) {
    return this.reviewsService.adminList({ rating, filter, productId, search });
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post()
  create(@Req() req: { user: RequestUser }, @Body() body: CreateReviewRequest) {
    return this.reviewsService.create(req.user.id, body);
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch(':id')
  update(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: Partial<CreateReviewRequest>,
  ) {
    return this.reviewsService.updateMine(req.user.id, id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.write')
  @Patch(':id/reply')
  reply(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: { ownerReply?: string; reply?: string },
  ) {
    return this.reviewsService.reply(
      req.user.id,
      id,
      body.ownerReply ?? body.reply ?? '',
      req.user.name,
    );
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.write')
  @Patch(':id/moderate')
  moderate(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body()
    body: {
      action: 'hide' | 'restore' | 'flag' | 'unflag' | 'reviewed' | 'delete';
      reason?: string;
    },
  ) {
    return this.reviewsService.moderate(
      id,
      body.action,
      {
        id: req.user.id,
        name: req.user.name,
      },
      body.reason,
    );
  }
}
