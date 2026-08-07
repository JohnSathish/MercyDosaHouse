import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RequestUser } from '../../common/guards';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: { user: RequestUser }) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  updateProfile(@Req() req: { user: RequestUser }, @Body() body: { name?: string }) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get('me/addresses')
  getAddresses(@Req() req: { user: RequestUser }) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('me/addresses')
  createAddress(@Req() req: { user: RequestUser }, @Body() body: Record<string, unknown>) {
    return this.usersService.createAddress(req.user.id, body as never);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.usersService.deleteAddress(req.user.id, id);
  }

  @Get('me/orders')
  getOrders(@Req() req: { user: RequestUser }) {
    return this.usersService.getOrders(req.user.id);
  }

  @Get('me/favorites')
  getFavorites(@Req() req: { user: RequestUser }) {
    return this.usersService.getFavorites(req.user.id);
  }

  @Post('me/favorites/:productId')
  addFavorite(@Req() req: { user: RequestUser }, @Param('productId') productId: string) {
    return this.usersService.addFavorite(req.user.id, productId);
  }

  @Delete('me/favorites/:productId')
  removeFavorite(@Req() req: { user: RequestUser }, @Param('productId') productId: string) {
    return this.usersService.removeFavorite(req.user.id, productId);
  }
}
