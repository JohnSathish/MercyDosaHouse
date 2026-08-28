import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FoodType } from '@prisma/client';
import { ProductsService } from './products.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('foodType') foodType?: FoodType,
    @Query('search') search?: string,
    @Query('available') available?: string,
    @Query('popular') popular?: string,
    @Query('featured') featured?: string,
    @Query('bestseller') bestseller?: string,
    @Query('onOffer') onOffer?: string,
    @Query('preOrder') preOrder?: string,
    @Query('comingSoon') comingSoon?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll({
      categoryId,
      foodType,
      search,
      available: available === 'true',
      popular: popular === 'true',
      featured: featured === 'true',
      bestseller: bestseller === 'true',
      onOffer: onOffer === 'true',
      preOrder: preOrder === 'true',
      comingSoon: comingSoon === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('products.write')
  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.productsService.create(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('products.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.productsService.update(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('products.write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
