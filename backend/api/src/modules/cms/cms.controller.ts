import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private cmsService: CmsService) {}

  @Public()
  @Get('published')
  getPublishedContent() {
    return this.cmsService.getPublishedSiteContent();
  }

  // Sections
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('sections')
  getSections(@Query('pageKey') pageKey?: string) {
    return this.cmsService.getSections(pageKey);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Put('sections')
  upsertSection(@Body() body: Record<string, unknown>) {
    return this.cmsService.upsertSection(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('sections/:id/publish')
  publishSection(@Param('id') id: string) {
    return this.cmsService.publishSection(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.cmsService.deleteSection(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('sections/reorder')
  reorderSections(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.cmsService.reorderSections(body.items);
  }

  // Pages
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('pages')
  getPages() {
    return this.cmsService.getPages();
  }

  @Public()
  @Get('pages/:slug')
  getPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.getPageBySlug(slug);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('pages')
  createPage(@Body() body: Record<string, unknown>) {
    return this.cmsService.createPage(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('pages/:id')
  updatePage(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.updatePage(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('pages/:id/publish')
  publishPage(@Param('id') id: string) {
    return this.cmsService.publishPage(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('pages/:id')
  deletePage(@Param('id') id: string) {
    return this.cmsService.deletePage(id);
  }

  // Gallery
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('gallery')
  getGallery(@Query('all') all?: string) {
    return this.cmsService.getGallery(all === 'true');
  }

  @Public()
  @Get('gallery/public')
  getPublicGallery() {
    return this.cmsService.getGallery(false);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('gallery')
  createGalleryItem(@Body() body: Record<string, unknown>) {
    return this.cmsService.createGalleryItem(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('gallery/:id')
  updateGalleryItem(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.updateGalleryItem(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('gallery/:id')
  deleteGalleryItem(@Param('id') id: string) {
    return this.cmsService.deleteGalleryItem(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('gallery/reorder')
  reorderGallery(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.cmsService.reorderGallery(body.items);
  }

  // Testimonials
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('testimonials')
  getTestimonials(@Query('all') all?: string) {
    return this.cmsService.getTestimonials(all === 'true');
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('testimonials')
  createTestimonial(@Body() body: Record<string, unknown>) {
    return this.cmsService.createTestimonial(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('testimonials/:id')
  updateTestimonial(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.updateTestimonial(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('testimonials/:id')
  deleteTestimonial(@Param('id') id: string) {
    return this.cmsService.deleteTestimonial(id);
  }

  // FAQs
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('faqs')
  getFaqs(@Query('all') all?: string) {
    return this.cmsService.getFaqs(all === 'true');
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('faqs')
  createFaq(@Body() body: Record<string, unknown>) {
    return this.cmsService.createFaq(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('faqs/:id')
  updateFaq(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.updateFaq(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('faqs/:id')
  deleteFaq(@Param('id') id: string) {
    return this.cmsService.deleteFaq(id);
  }

  // Announcements
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('announcements')
  getAnnouncements(@Query('all') all?: string) {
    return this.cmsService.getAnnouncements(all === 'true');
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('announcements')
  createAnnouncement(@Body() body: Record<string, unknown>) {
    return this.cmsService.createAnnouncement(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('announcements/:id')
  updateAnnouncement(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.updateAnnouncement(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.cmsService.deleteAnnouncement(id);
  }

  // Navigation
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('navigation')
  getNavigation(@Query('menuKey') menuKey?: string) {
    return this.cmsService.getNavigation(menuKey);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Put('navigation')
  upsertNavigation(@Body() body: Record<string, unknown>) {
    return this.cmsService.upsertNavigationItem(body as never);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('navigation/:id')
  deleteNavigation(@Param('id') id: string) {
    return this.cmsService.deleteNavigationItem(id);
  }

  // Theme
  @Public()
  @Get('theme')
  getTheme() {
    return this.cmsService.getThemeSettings();
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('theme')
  updateTheme(@Body() body: Record<string, unknown>) {
    return this.cmsService.updateThemeSettings(body);
  }

  // SEO
  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('seo')
  getSeo() {
    return this.cmsService.getSeoEntries();
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Put('seo/:pageKey')
  upsertSeo(@Param('pageKey') pageKey: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.upsertSeo(pageKey, body);
  }
}
