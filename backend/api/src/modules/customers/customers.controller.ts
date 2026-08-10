import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyTier } from '@prisma/client';
import { CustomersService } from './customers.service';
import { RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('dashboard')
  @RequirePermissions('users.read')
  getDashboard() {
    return this.customersService.getDashboard();
  }

  @Get()
  @RequirePermissions('users.read')
  listCustomers(
    @Query('search') search?: string,
    @Query('filter') filter?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.listCustomers({
      search,
      filter,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('duplicates')
  @RequirePermissions('users.read')
  findDuplicates() {
    return this.customersService.findDuplicates();
  }

  @Get(':id')
  @RequirePermissions('users.read')
  getCustomer(@Param('id') id: string) {
    return this.customersService.getCustomer(id);
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  updateCustomer(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      tags?: string[];
      adminNotes?: string;
      preferredPayment?: string;
      preferredDelivery?: string;
      isBlocked?: boolean;
      isActive?: boolean;
      loyaltyPoints?: number;
      loyaltyTier?: LoyaltyTier;
    },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.customersService.updateCustomer(id, body, req.user?.sub);
  }

  @Post(':id/notes')
  @RequirePermissions('users.write')
  addNote(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.customersService.addNote(id, body.content, req.user?.sub);
  }

  @Post(':id/rewards/adjust')
  @RequirePermissions('users.write')
  adjustRewards(
    @Param('id') id: string,
    @Body() body: { points: number; description: string },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.customersService.adjustRewards(id, body.points, body.description, req.user?.sub);
  }

  @Post(':id/rewards/reset')
  @RequirePermissions('users.write')
  resetRewards(@Param('id') id: string, @Req() req: { user?: { sub: string } }) {
    return this.customersService.resetRewards(id, req.user?.sub);
  }

  @Post(':id/coupons')
  @RequirePermissions('users.write')
  assignCoupon(@Param('id') id: string, @Body() body: { couponId: string; expiresAt?: string }) {
    return this.customersService.assignCoupon(id, body.couponId, body.expiresAt);
  }

  @Patch(':id/block')
  @RequirePermissions('users.write')
  blockCustomer(@Param('id') id: string, @Body() body: { blocked: boolean }) {
    return this.customersService.blockCustomer(id, body.blocked);
  }

  @Delete(':id')
  @RequirePermissions('users.write')
  deleteCustomer(@Param('id') id: string) {
    return this.customersService.deleteCustomer(id);
  }

  @Post('merge')
  @RequirePermissions('users.write')
  mergeCustomers(@Body() body: { keepId: string; mergeId: string }) {
    return this.customersService.mergeCustomers(body.keepId, body.mergeId);
  }

  @Patch('reviews/:reviewId/reply')
  @RequirePermissions('users.write')
  replyReview(@Param('reviewId') reviewId: string, @Body() body: { reply: string }) {
    return this.customersService.replyReview(reviewId, body.reply);
  }
}
