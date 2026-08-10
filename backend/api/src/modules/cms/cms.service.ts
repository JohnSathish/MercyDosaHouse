import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  /** Public: all published site content for the website */
  async getPublishedSiteContent() {
    const now = new Date();
    const [
      sections,
      pages,
      gallery,
      testimonials,
      faqs,
      announcements,
      navigation,
      theme,
      seo,
      offers,
    ] = await Promise.all([
      this.prisma.cmsSection.findMany({
        where: { isEnabled: true, status: ContentStatus.PUBLISHED },
        orderBy: [{ pageKey: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.cmsPage.findMany({
        where: { status: ContentStatus.PUBLISHED },
        orderBy: { title: 'asc' },
      }),
      this.prisma.galleryItem.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.testimonial.findMany({
        where: { isPublished: true },
        orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.faq.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.announcement.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.navigationItem.findMany({
        where: { isActive: true },
        orderBy: [{ menuKey: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.getThemeSettings(),
      this.prisma.seoMetadata.findMany(),
      this.prisma.offer.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return {
      sections,
      pages,
      gallery,
      testimonials,
      faqs,
      announcements,
      navigation,
      theme,
      seo,
      offers: offers.map(this.mapOffer),
    };
  }

  // ─── Sections (Homepage Builder) ───────────────────────────────────────────

  getSections(pageKey?: string) {
    return this.prisma.cmsSection.findMany({
      where: pageKey ? { pageKey } : undefined,
      orderBy: [{ pageKey: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  upsertSection(data: {
    pageKey: string;
    sectionKey: string;
    title?: string;
    content: Prisma.InputJsonValue;
    sortOrder?: number;
    isEnabled?: boolean;
    status?: ContentStatus;
  }) {
    const { pageKey, sectionKey, content, ...rest } = data;
    return this.prisma.cmsSection.upsert({
      where: { pageKey_sectionKey: { pageKey, sectionKey } },
      create: { pageKey, sectionKey, content: content ?? {}, ...rest },
      update: { content, ...rest },
    });
  }

  publishSection(id: string) {
    return this.prisma.cmsSection.update({
      where: { id },
      data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  deleteSection(id: string) {
    return this.prisma.cmsSection.delete({ where: { id } });
  }

  reorderSections(items: { id: string; sortOrder: number }[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.cmsSection.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  // ─── Pages ─────────────────────────────────────────────────────────────────

  getPages() {
    return this.prisma.cmsPage.findMany({ orderBy: { title: 'asc' } });
  }

  getPageBySlug(slug: string) {
    return this.prisma.cmsPage.findUnique({ where: { slug } });
  }

  createPage(data: Prisma.CmsPageCreateInput) {
    return this.prisma.cmsPage.create({ data });
  }

  updatePage(id: string, data: Prisma.CmsPageUpdateInput) {
    return this.prisma.cmsPage.update({ where: { id }, data });
  }

  deletePage(id: string) {
    return this.prisma.cmsPage.delete({ where: { id } });
  }

  publishPage(id: string) {
    return this.prisma.cmsPage.update({
      where: { id },
      data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  // ─── Gallery ───────────────────────────────────────────────────────────────

  getGallery(all = false) {
    return this.prisma.galleryItem.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  createGalleryItem(data: Prisma.GalleryItemCreateInput) {
    return this.prisma.galleryItem.create({ data });
  }

  updateGalleryItem(id: string, data: Prisma.GalleryItemUpdateInput) {
    return this.prisma.galleryItem.update({ where: { id }, data });
  }

  deleteGalleryItem(id: string) {
    return this.prisma.galleryItem.delete({ where: { id } });
  }

  reorderGallery(items: { id: string; sortOrder: number }[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.galleryItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  // ─── Testimonials ──────────────────────────────────────────────────────────

  getTestimonials(all = false) {
    return this.prisma.testimonial.findMany({
      where: all ? undefined : { isPublished: true },
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  createTestimonial(data: Prisma.TestimonialCreateInput) {
    return this.prisma.testimonial.create({ data });
  }

  updateTestimonial(id: string, data: Prisma.TestimonialUpdateInput) {
    return this.prisma.testimonial.update({ where: { id }, data });
  }

  deleteTestimonial(id: string) {
    return this.prisma.testimonial.delete({ where: { id } });
  }

  // ─── FAQs ─────────────────────────────────────────────────────────────────

  getFaqs(all = false) {
    return this.prisma.faq.findMany({
      where: all ? undefined : { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createFaq(data: Prisma.FaqCreateInput) {
    return this.prisma.faq.create({ data });
  }

  updateFaq(id: string, data: Prisma.FaqUpdateInput) {
    return this.prisma.faq.update({ where: { id }, data });
  }

  deleteFaq(id: string) {
    return this.prisma.faq.delete({ where: { id } });
  }

  // ─── Announcements ─────────────────────────────────────────────────────────

  getAnnouncements(all = false) {
    return this.prisma.announcement.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createAnnouncement(data: Prisma.AnnouncementCreateInput) {
    return this.prisma.announcement.create({ data });
  }

  updateAnnouncement(id: string, data: Prisma.AnnouncementUpdateInput) {
    return this.prisma.announcement.update({ where: { id }, data });
  }

  deleteAnnouncement(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  getNavigation(menuKey?: string) {
    return this.prisma.navigationItem.findMany({
      where: menuKey ? { menuKey } : undefined,
      orderBy: [{ menuKey: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  upsertNavigationItem(data: {
    id?: string;
    menuKey: string;
    label: string;
    href: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const { id, ...rest } = data;
    if (id) return this.prisma.navigationItem.update({ where: { id }, data: rest });
    return this.prisma.navigationItem.create({ data: rest });
  }

  deleteNavigationItem(id: string) {
    return this.prisma.navigationItem.delete({ where: { id } });
  }

  // ─── Theme ─────────────────────────────────────────────────────────────────

  async getThemeSettings() {
    const existing = await this.prisma.themeSettings.findFirst();
    if (existing) return existing;
    return this.prisma.themeSettings.create({ data: {} });
  }

  updateThemeSettings(data: Prisma.ThemeSettingsUpdateInput) {
    return this.getThemeSettings().then((theme) =>
      this.prisma.themeSettings.update({ where: { id: theme.id }, data }),
    );
  }

  // ─── SEO ───────────────────────────────────────────────────────────────────

  getSeoEntries() {
    return this.prisma.seoMetadata.findMany({ orderBy: { pageKey: 'asc' } });
  }

  upsertSeo(pageKey: string, data: Prisma.SeoMetadataUpdateInput) {
    return this.prisma.seoMetadata.upsert({
      where: { pageKey },
      create: { pageKey, ...data } as Prisma.SeoMetadataCreateInput,
      update: data,
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private mapOffer(offer: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    discountPct: Prisma.Decimal | null;
    type: string;
    buttonLabel: string | null;
    buttonUrl: string | null;
    displayPosition: string | null;
    sortOrder: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }) {
    return {
      ...offer,
      discountPct: offer.discountPct ? Number(offer.discountPct) : null,
    };
  }

  async getSectionContent(pageKey: string, sectionKey: string) {
    const section = await this.prisma.cmsSection.findUnique({
      where: { pageKey_sectionKey: { pageKey, sectionKey } },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }
}
