import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll(@Query('active') active?: string) {
    return this.categoriesService.findAll(active === 'true');
  }

  @Get('dashboard')
  @RequirePermissions('categories.read')
  getDashboard() {
    return this.categoriesService.getDashboard();
  }

  @Get('admin')
  @RequirePermissions('categories.read')
  findAllAdmin(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('featured') featured?: string,
    @Query('popular') popular?: string,
    @Query('empty') empty?: string,
    @Query('seasonal') seasonal?: string,
    @Query('hasBanner') hasBanner?: string,
  ) {
    return this.categoriesService.findAllAdmin({
      search,
      status,
      featured,
      popular,
      empty,
      seasonal,
      hasBanner,
    });
  }

  @Get('insights')
  @RequirePermissions('categories.read')
  getInsights() {
    return this.categoriesService.getInsights();
  }

  @Get('export')
  @RequirePermissions('categories.read')
  async exportCsv() {
    const csv = await this.categoriesService.exportCsv();
    return { csv, filename: 'categories.csv' };
  }

  @Post('reorder')
  @RequirePermissions('categories.write')
  reorder(@Body() body: { ids: string[] }, @Req() req: { user: RequestUser }) {
    return this.categoriesService.reorder(body.ids, req.user.id);
  }

  @Post('bulk')
  @RequirePermissions('categories.write')
  bulk(@Body() body: { action: string; ids: string[] }, @Req() req: { user: RequestUser }) {
    return this.categoriesService.bulkAction(body.action, body.ids, req.user.id);
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

  @Get(':id/timeline')
  @RequirePermissions('categories.read')
  getTimeline(@Param('id') id: string) {
    return this.categoriesService.getTimeline(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: { user: RequestUser }) {
    return this.categoriesService.create(body, req.user.id);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.categoriesService.duplicate(id, req.user.id);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: { user: RequestUser },
  ) {
    return this.categoriesService.update(id, body, req.user.id);
  }

  @ApiBearerAuth()
  @RequirePermissions('categories.write')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.categoriesService.remove(id, req.user.id);
  }
}
