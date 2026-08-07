import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll(@Query('active') active?: string) {
    return this.categoriesService.findAll(active === 'true');
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Post()
  create(@Body() body: { name: string; slug: string; description?: string; sortOrder?: number }) {
    return this.categoriesService.create(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.categoriesService.update(id, body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
