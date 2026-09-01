import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseSiteSeoConfig } from '../settings/seo-config';

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

  private readonly defaultSeoPages: {
    pageKey: string;
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
  }[] = [
    {
      pageKey: 'home',
      metaTitle: 'Mercy Dosa House | South Indian Restaurant in Tura, Meghalaya',
      metaDescription:
        'Mercy Dosa House in Tura, Meghalaya serves authentic South Indian food including crispy dosa, idli, vada and Chicken Dum Biryani. Order online for takeaway and home delivery.',
      canonicalUrl: 'https://mercydosahouse.com/',
    },
    {
      pageKey: 'menu',
      metaTitle: 'Menu | Mercy Dosa House Tura',
      metaDescription:
        'Browse dosa, idli, vada, biryani and more at Mercy Dosa House in Tura, Meghalaya. Order online for takeaway or home delivery.',
      canonicalUrl: 'https://mercydosahouse.com/menu',
    },
    {
      pageKey: 'about',
      metaTitle: 'About Mercy Dosa House | South Indian Kitchen in Tura',
      metaDescription:
        'Learn about Mercy Dosa House, a South Indian kitchen in Tura, Meghalaya serving dosa, idli, vada and Sunday Chicken Dum Biryani.',
      canonicalUrl: 'https://mercydosahouse.com/about',
    },
    {
      pageKey: 'contact',
      metaTitle: 'Contact Mercy Dosa House | Tura, Meghalaya',
      metaDescription:
        'Call, WhatsApp or visit Mercy Dosa House in Tura, Meghalaya. Ask about menu, delivery areas and opening hours.',
      canonicalUrl: 'https://mercydosahouse.com/contact',
    },
    {
      pageKey: 'gallery',
      metaTitle: 'Gallery | Mercy Dosa House Tura',
      metaDescription: 'Photos of South Indian food from Mercy Dosa House in Tura, Meghalaya.',
      canonicalUrl: 'https://mercydosahouse.com/gallery',
    },
    {
      pageKey: 'offers',
      metaTitle: 'Offers | Mercy Dosa House Tura',
      metaDescription: 'Current offers from Mercy Dosa House in Tura, Meghalaya.',
      canonicalUrl: 'https://mercydosahouse.com/offers',
    },
    {
      pageKey: 'reviews',
      metaTitle: 'Customer Reviews | Mercy Dosa House Tura',
      metaDescription:
        'Read verified customer reviews of Mercy Dosa House in Tura, Meghalaya. Only approved feedback from real orders is shown.',
      canonicalUrl: 'https://mercydosahouse.com/reviews',
    },
    {
      pageKey: 'faq',
      metaTitle: 'FAQ | Mercy Dosa House Tura',
      metaDescription: 'Frequently asked questions about ordering from Mercy Dosa House in Tura.',
      canonicalUrl: 'https://mercydosahouse.com/faq',
    },
    {
      pageKey: 'privacy',
      metaTitle: 'Privacy Policy | Mercy Dosa House',
      metaDescription: 'Privacy policy for the Mercy Dosa House website and apps.',
      canonicalUrl: 'https://mercydosahouse.com/privacy',
    },
    {
      pageKey: 'fssai',
      metaTitle: 'FSSAI | Mercy Dosa House Tura',
      metaDescription: 'FSSAI licence details for Mercy Dosa House in Tura, Meghalaya.',
      canonicalUrl: 'https://mercydosahouse.com/fssai',
    },
    {
      pageKey: 'south-indian-restaurant-tura',
      metaTitle: 'South Indian Restaurant in Tura, Meghalaya | Mercy Dosa House',
      metaDescription:
        'Mercy Dosa House is a South Indian restaurant in Tura, Meghalaya. Order dosa, idli, vada and Chicken Dum Biryani online for delivery or takeaway.',
      canonicalUrl: 'https://mercydosahouse.com/south-indian-restaurant-tura',
    },
    {
      pageKey: 'south-indian-food-tura',
      metaTitle: 'Authentic South Indian Food in Tura | Mercy Dosa House',
      metaDescription:
        'Find authentic South Indian food in Tura at Mercy Dosa House — dosa, idli, vada and biryani, prepared to order.',
      canonicalUrl: 'https://mercydosahouse.com/south-indian-food-tura',
    },
    {
      pageKey: 'dosa-tura',
      metaTitle: 'Dosa in Tura, Meghalaya | Mercy Dosa House',
      metaDescription:
        'Order crispy dosa in Tura from Mercy Dosa House. See the live menu for prices, availability and home delivery.',
      canonicalUrl: 'https://mercydosahouse.com/dosa-tura',
    },
    {
      pageKey: 'idli-tura',
      metaTitle: 'Idli in Tura, Meghalaya | Mercy Dosa House',
      metaDescription:
        'Soft idli in Tura from Mercy Dosa House. Order online from the live menu for takeaway or delivery.',
      canonicalUrl: 'https://mercydosahouse.com/idli-tura',
    },
    {
      pageKey: 'vada-tura',
      metaTitle: 'Vada in Tura, Meghalaya | Mercy Dosa House',
      metaDescription:
        'Crisp vada in Tura from Mercy Dosa House. Check today’s menu and order online.',
      canonicalUrl: 'https://mercydosahouse.com/vada-tura',
    },
    {
      pageKey: 'chicken-dum-biryani-tura',
      metaTitle: 'Chicken Dum Biryani in Tura | Mercy Dosa House',
      metaDescription:
        'Order authentic Chicken Dum Biryani in Tura from Mercy Dosa House. Available every Sunday at 1 PM. Pre-order one day in advance. Home delivery available.',
      canonicalUrl: 'https://mercydosahouse.com/chicken-dum-biryani-tura',
    },
  ];

  async ensureDefaultSeoPages() {
    for (const page of this.defaultSeoPages) {
      await this.prisma.seoMetadata.upsert({
        where: { pageKey: page.pageKey },
        create: page,
        update: {},
      });
    }
  }

  async getSeoEntries() {
    await this.ensureDefaultSeoPages();
    return this.prisma.seoMetadata.findMany({ orderBy: { pageKey: 'asc' } });
  }

  async getPublicSeo() {
    const pages = await this.getSeoEntries();
    return {
      pages: pages.map((page) => ({
        id: page.id,
        pageKey: page.pageKey,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        keywords: page.keywords,
        ogImage: page.ogImage,
        canonicalUrl: page.canonicalUrl,
        noIndex: page.noIndex,
        noFollow: page.noFollow,
      })),
    };
  }

  upsertSeo(pageKey: string, data: Record<string, unknown>) {
    const patch: Prisma.SeoMetadataUpdateInput = {};
    if ('metaTitle' in data) patch.metaTitle = (data.metaTitle as string) || null;
    if ('metaDescription' in data) patch.metaDescription = (data.metaDescription as string) || null;
    if ('keywords' in data) patch.keywords = (data.keywords as string) || null;
    if ('ogImage' in data) patch.ogImage = (data.ogImage as string) || null;
    if ('canonicalUrl' in data) patch.canonicalUrl = (data.canonicalUrl as string) || null;
    if ('noIndex' in data) patch.noIndex = Boolean(data.noIndex);
    if ('noFollow' in data) patch.noFollow = Boolean(data.noFollow);
    return this.prisma.seoMetadata.upsert({
      where: { pageKey },
      create: {
        pageKey,
        metaTitle: (data.metaTitle as string) || null,
        metaDescription: (data.metaDescription as string) || null,
        keywords: (data.keywords as string) || null,
        ogImage: (data.ogImage as string) || null,
        canonicalUrl: (data.canonicalUrl as string) || null,
        noIndex: Boolean(data.noIndex),
        noFollow: Boolean(data.noFollow),
      },
      update: patch,
    });
  }

  async getSeoHealth() {
    const [products, pages, media, settings, theme] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          seoTitle: true,
          seoDescription: true,
          imageAltText: true,
          imageUrl: true,
        },
      }),
      this.getSeoEntries(),
      this.prisma.mediaAsset.findMany({ select: { id: true, altText: true, filename: true } }),
      this.prisma.businessSettings.findFirst(),
      this.prisma.themeSettings.findFirst(),
    ]);
    const seo = parseSiteSeoConfig(settings?.seoConfig);
    const missingDesc = products.filter((p) => !p.description?.trim());
    const missingSeoTitle = products.filter((p) => !p.seoTitle?.trim());
    const missingSeoDesc = products.filter((p) => !p.seoDescription?.trim());
    const missingAlt = products.filter((p) => p.imageUrl && !p.imageAltText?.trim());
    const mediaMissingAlt = media.filter((m) => !m.altText?.trim());
    const slugCounts = new Map<string, number>();
    for (const p of products) slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1);
    const duplicateSlugs = [...slugCounts.entries()].filter(([, n]) => n > 1).map(([slug]) => slug);
    const titleCounts = new Map<string, string[]>();
    for (const page of pages) {
      const title = page.metaTitle?.trim();
      if (!title) continue;
      titleCounts.set(title, [...(titleCounts.get(title) ?? []), page.pageKey]);
    }
    const duplicateTitles = [...titleCounts.entries()]
      .filter(([, keys]) => keys.length > 1)
      .map(([title, keys]) => ({ title, pageKeys: keys }));
    const noIndexPages = pages.filter((p) => p.noIndex).map((p) => p.pageKey);
    const indexablePages = pages.filter((p) => !p.noIndex).map((p) => p.pageKey);
    const pagesMissingTitle = pages.filter((p) => !p.metaTitle?.trim() && p.pageKey !== 'home');
    const pagesMissingDesc = pages.filter((p) => !p.metaDescription?.trim());

    const warnings: { id: string; message: string; href: string; count?: number }[] = [];
    if (missingSeoDesc.length) {
      warnings.push({
        id: 'product-seo-desc',
        message: `${missingSeoDesc.length} products are missing SEO descriptions.`,
        href: '/cms/seo',
        count: missingSeoDesc.length,
      });
    }
    if (missingAlt.length) {
      warnings.push({
        id: 'product-alt',
        message: `${missingAlt.length} product images are missing alt text.`,
        href: '/cms/seo',
        count: missingAlt.length,
      });
    }
    if (mediaMissingAlt.length) {
      warnings.push({
        id: 'media-alt',
        message: `${mediaMissingAlt.length} media library images are missing alt text.`,
        href: '/cms/media',
        count: mediaMissingAlt.length,
      });
    }
    if (missingDesc.length) {
      warnings.push({
        id: 'product-desc',
        message: `${missingDesc.length} products are missing descriptions.`,
        href: '/cms/seo',
        count: missingDesc.length,
      });
    }
    if (missingSeoTitle.length) {
      warnings.push({
        id: 'product-seo-title',
        message: `${missingSeoTitle.length} products are missing SEO titles.`,
        href: '/cms/seo',
        count: missingSeoTitle.length,
      });
    }
    if (duplicateTitles.length) {
      warnings.push({
        id: 'duplicate-titles',
        message: `${duplicateTitles.length} pages have duplicate titles.`,
        href: '/cms/seo',
        count: duplicateTitles.length,
      });
    }
    if (duplicateSlugs.length) {
      warnings.push({
        id: 'duplicate-slugs',
        message: `${duplicateSlugs.length} duplicate product slugs.`,
        href: '/cms/seo',
        count: duplicateSlugs.length,
      });
    }
    if (pagesMissingTitle.length) {
      warnings.push({
        id: 'page-title',
        message: `${pagesMissingTitle.length} pages are missing SEO titles.`,
        href: '/cms/seo',
        count: pagesMissingTitle.length,
      });
    }
    if (pagesMissingDesc.length) {
      warnings.push({
        id: 'page-desc',
        message: `${pagesMissingDesc.length} pages are missing SEO descriptions.`,
        href: '/cms/seo',
        count: pagesMissingDesc.length,
      });
    }

    return {
      checks: {
        sitemap: true,
        robots: true,
        https: seo.canonicalDomain.startsWith('https://'),
        canonicalTags: pages.filter((p) => p.canonicalUrl).length,
        metaTitles: pages.filter((p) => p.metaTitle).length,
        metaDescriptions: pages.filter((p) => p.metaDescription).length,
        structuredData: true,
        defaultOgImage: Boolean(seo.defaultOgImage || theme?.logoUrl),
        googleVerification: Boolean(seo.googleVerification),
      },
      indexablePages,
      noIndexPages,
      duplicateTitles,
      duplicateSlugs,
      warnings,
    };
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
