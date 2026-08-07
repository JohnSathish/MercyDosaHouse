import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get()
  findAll(@Query('productId') productId?: string) {
    return this.reviewsService.findAll(productId);
  }

  @ApiBearerAuth()
  @Post()
  create(@Req() req: { user: RequestUser }, @Body() body: Record<string, unknown>) {
    return this.reviewsService.create(req.user.id, body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('settings.write')
  @Patch(':id/reply')
  reply(@Param('id') id: string, @Body() body: { ownerReply: string }) {
    return this.reviewsService.reply(id, body.ownerReply);
  }
}
