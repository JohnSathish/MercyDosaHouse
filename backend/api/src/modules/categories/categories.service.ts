import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { displayCategoryName, isGarbledCategoryName } from './category-display-name';

const categoryInclude = {
  products: {
    where: { deletedAt: null },
    select: { id: true, name: true, isAvailable: true, price: true, isPopular: true },
  },
  schedules: { orderBy: { label: 'asc' as const } },
  analytics: true,
  tags: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  banners: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { products: { where: { deletedAt: null } } } },
} satisfies Prisma.CategoryInclude;

type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private num(v: Prisma.Decimal | number | null | undefined): number {
    if (v == null) return 0;
    return Number(v);
  }

  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async log(categoryId: string, action: string, description: string, userId?: string) {
    await this.prisma.categoryLog.create({
      data: { categoryId, action, description, userId },
    });
  }

  private mapCategory(cat: CategoryRow) {
    const availableItems = cat.products.filter((p) => p.isAvailable).length;
    const unavailableItems = cat.products.length - availableItems;
    const topProduct = [...cat.products].sort((a, b) => this.num(b.price) - this.num(a.price))[0];

    return {
      id: cat.id,
      name: displayCategoryName(cat.name, cat.slug),
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      icon: cat.icon,
      bannerUrl: cat.bannerUrl,
      thumbnailUrl: cat.thumbnailUrl,
      mobileImageUrl: cat.mobileImageUrl,
      cardImageUrl: cat.cardImageUrl,
      backgroundColor: cat.backgroundColor,
      textColor: cat.textColor,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      status: cat.status,
      badge: cat.badge,
      isFeatured: cat.isFeatured,
      isPopular: cat.isPopular,
      isSeasonal: cat.isSeasonal,
      seasonalName: cat.seasonalName,
      seasonalStart: cat.seasonalStart?.toISOString() ?? null,
      seasonalEnd: cat.seasonalEnd?.toISOString() ?? null,
      showOnHome: cat.showOnHome,
      showInMobileApp: cat.showInMobileApp,
      showInOffers: cat.showInOffers,
      allowOrdering: cat.allowOrdering,
      showOnWebsite: cat.showOnWebsite,
      showOnPos: cat.showOnPos,
      showOnDelivery: cat.showOnDelivery,
      showOnQrMenu: cat.showOnQrMenu,
      gstPercent: cat.gstPercent ? this.num(cat.gstPercent) : null,
      prepTimeMinutes: cat.prepTimeMinutes,
      servingTimeMinutes: cat.servingTimeMinutes,
      seoTitle: cat.seoTitle,
      seoDescription: cat.seoDescription,
      seoKeywords: cat.seoKeywords,
      canonicalUrl: cat.canonicalUrl,
      ogImageUrl: cat.ogImageUrl,
      itemCount: cat._count.products,
      availableItems,
      unavailableItems,
      products: cat.products,
      schedules: cat.schedules,
      tags: cat.tags.map((t) => t.tag),
      images: cat.images,
      banners: cat.banners,
      analytics: cat.analytics
        ? {
            views: cat.analytics.views,
            orders: cat.analytics.orders,
            revenue: this.num(cat.analytics.revenue),
            conversion: this.num(cat.analytics.conversion),
            popularity: this.num(cat.analytics.popularity),
          }
        : { views: 0, orders: 0, revenue: 0, conversion: 0, popularity: 0 },
      topSellingItem: topProduct?.name ?? null,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    };
  }

  /** Public API — lightweight list */
  async findAll(activeOnly = false, channel?: string) {
    const where: {
      isActive?: boolean;
      status?: typeof CategoryStatus.PUBLISHED;
      showOnWebsite?: boolean;
      showInMobileApp?: boolean;
    } = {};

    if (activeOnly) {
      where.isActive = true;
      where.status = CategoryStatus.PUBLISHED;
      if (channel === 'mobile') {
        where.showInMobileApp = true;
      } else {
        where.showOnWebsite = true;
      }
    }

    const rows = await this.prisma.category.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        icon: true,
        mobileImageUrl: true,
        thumbnailUrl: true,
        sortOrder: true,
        isActive: true,
        badge: true,
        isFeatured: true,
        isPopular: true,
        showOnHome: true,
      },
    });

    await this.repairGarbledCategoryNames(rows);

    return rows.map((row) => ({
      ...row,
      name: displayCategoryName(row.name, row.slug),
    }));
  }

  private async repairGarbledCategoryNames(
    rows: Array<{ id: string; name: string; slug: string }>,
  ) {
    const repairs = rows.filter((row) => isGarbledCategoryName(row.name, row.slug));
    await Promise.all(
      repairs.map((row) => {
        const name = displayCategoryName(row.name, row.slug);
        row.name = name;
        return this.prisma.category.update({ where: { id: row.id }, data: { name } });
      }),
    );
  }

  async getDashboard() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [categories, totalProducts, orderItems] = await Promise.all([
      this.prisma.category.findMany({
        include: categoryInclude,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } } },
        include: { product: { select: { categoryId: true, name: true } } },
      }),
    ]);

    await this.repairGarbledCategoryNames(categories);

    const revenueByCategory = new Map<string, { revenue: number; orders: number }>();
    for (const item of orderItems) {
      if (!item.product?.categoryId) continue;
      const cur = revenueByCategory.get(item.product.categoryId) ?? { revenue: 0, orders: 0 };
      cur.revenue += this.num(item.totalPrice);
      cur.orders += item.quantity;
      revenueByCategory.set(item.product.categoryId, cur);
    }

    let bestCategory = categories[0]
      ? displayCategoryName(categories[0].name, categories[0].slug)
      : '—';
    let bestRevenue = 0;
    for (const [catId, data] of revenueByCategory) {
      if (data.revenue > bestRevenue) {
        bestRevenue = data.revenue;
        const match = categories.find((c) => c.id === catId);
        bestCategory = match ? displayCategoryName(match.name, match.slug) : bestCategory;
      }
    }

    const totalRevenue = [...revenueByCategory.values()].reduce((s, v) => s + v.revenue, 0);
    const active = categories.filter((c) => c.status === CategoryStatus.PUBLISHED).length;
    const inactive = categories.length - active;

    const mapped = categories.map((c) => {
      const stats = revenueByCategory.get(c.id);
      return {
        ...this.mapCategory(c),
        analytics: {
          ...(c.analytics
            ? {
                views: c.analytics.views,
                orders: stats?.orders ?? c.analytics.orders,
                revenue: stats?.revenue ?? this.num(c.analytics.revenue),
                conversion: this.num(c.analytics.conversion),
                popularity: this.num(c.analytics.popularity),
              }
            : {
                views: 0,
                orders: stats?.orders ?? 0,
                revenue: stats?.revenue ?? 0,
                conversion: 0,
                popularity: 0,
              }),
        },
      };
    });

    const popular = [...mapped]
      .sort((a, b) => b.analytics.revenue - a.analytics.revenue)
      .slice(0, 5);
    const leastSelling = [...mapped]
      .sort((a, b) => a.analytics.revenue - b.analytics.revenue)
      .slice(0, 5);
    const recentlyUpdated = [...mapped]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    const inactiveCategories = mapped.filter(
      (c) => c.status === CategoryStatus.INACTIVE || !c.isActive,
    );

    return {
      stats: {
        totalCategories: categories.length,
        active,
        inactive,
        menuItems: totalProducts,
        bestSellingCategory: bestCategory,
        revenueThisMonth: Math.round(totalRevenue),
      },
      widgets: {
        popular,
        leastSelling,
        recentlyUpdated,
        inactiveCategories,
        revenueByCategory: popular.map((c) => ({
          name: c.name,
          revenue: c.analytics.revenue,
          orders: c.analytics.orders,
        })),
      },
      categories: mapped,
    };
  }

  async findAllAdmin(query: {
    search?: string;
    status?: string;
    featured?: string;
    popular?: string;
    empty?: string;
    seasonal?: string;
    hasBanner?: string;
  }) {
    const where: Prisma.CategoryWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status as CategoryStatus;
    if (query.featured === 'true') where.isFeatured = true;
    if (query.popular === 'true') where.isPopular = true;
    if (query.seasonal === 'true') where.isSeasonal = true;
    if (query.hasBanner === 'true') where.bannerUrl = { not: null };
    if (query.empty === 'true') where.products = { none: {} };

    const rows = await this.prisma.category.findMany({
      where,
      include: categoryInclude,
      orderBy: { sortOrder: 'asc' },
    });

    return rows.map((c) => this.mapCategory(c));
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
    if (!cat) throw new NotFoundException('Category not found');
    return this.mapCategory(cat);
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: { where: { isAvailable: true, deletedAt: null }, orderBy: { name: 'asc' } },
      },
    });
  }

  async create(data: Record<string, unknown>, userId?: string) {
    const name = String(data.name ?? '');
    const slug = String(data.slug ?? this.slugify(name));
    const maxOrder = await this.prisma.category.aggregate({ _max: { sortOrder: true } });

    const cat = await this.prisma.category.create({
      data: {
        name,
        slug,
        description: data.description as string | undefined,
        icon: data.icon as string | undefined,
        imageUrl: data.imageUrl as string | undefined,
        bannerUrl: data.bannerUrl as string | undefined,
        thumbnailUrl: data.thumbnailUrl as string | undefined,
        sortOrder: (data.sortOrder as number | undefined) ?? (maxOrder._max.sortOrder ?? 0) + 1,
        status: (data.status as CategoryStatus | undefined) ?? CategoryStatus.DRAFT,
        isActive: data.status !== CategoryStatus.INACTIVE,
        badge: data.badge as never,
        isFeatured: Boolean(data.isFeatured),
        isPopular: Boolean(data.isPopular),
        backgroundColor: data.backgroundColor as string | undefined,
        textColor: data.textColor as string | undefined,
        seoTitle: data.seoTitle as string | undefined,
        seoDescription: data.seoDescription as string | undefined,
        analytics: { create: {} },
        settings: { create: {} },
      },
      include: categoryInclude,
    });

    await this.log(cat.id, 'CREATED', `Category "${name}" created`, userId);
    return this.mapCategory(cat);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    await this.ensureExists(id);

    const updateData: Prisma.CategoryUpdateInput = {};
    const fields = [
      'name',
      'slug',
      'description',
      'imageUrl',
      'icon',
      'bannerUrl',
      'thumbnailUrl',
      'mobileImageUrl',
      'cardImageUrl',
      'backgroundColor',
      'textColor',
      'sortOrder',
      'badge',
      'isFeatured',
      'isPopular',
      'isSeasonal',
      'seasonalName',
      'showOnHome',
      'showInMobileApp',
      'showInOffers',
      'allowOrdering',
      'showOnWebsite',
      'showOnPos',
      'showOnDelivery',
      'showOnQrMenu',
      'seoTitle',
      'seoDescription',
      'seoKeywords',
      'canonicalUrl',
      'ogImageUrl',
      'prepTimeMinutes',
      'servingTimeMinutes',
      'gstPercent',
    ] as const;

    for (const f of fields) {
      if (data[f] !== undefined) (updateData as Record<string, unknown>)[f] = data[f];
    }

    if (data.status !== undefined) {
      updateData.status = data.status as CategoryStatus;
      updateData.isActive =
        data.status === CategoryStatus.PUBLISHED || data.status === CategoryStatus.SEASONAL;
    }

    if (data.schedules && Array.isArray(data.schedules)) {
      await this.prisma.categorySchedule.deleteMany({ where: { categoryId: id } });
      await this.prisma.categorySchedule.createMany({
        data: (data.schedules as Array<{ label: string; startTime: string; endTime: string }>).map(
          (s) => ({
            categoryId: id,
            label: s.label,
            startTime: s.startTime,
            endTime: s.endTime,
          }),
        ),
      });
    }

    const cat = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: categoryInclude,
    });

    await this.log(id, 'UPDATED', `Category "${cat.name}" updated`, userId);
    return this.mapCategory(cat);
  }

  async duplicate(id: string, userId?: string) {
    const source = await this.findOne(id);
    const newName = `Copy of ${source.name}`;
    const newSlug = `${source.slug}-copy-${Date.now().toString(36)}`;

    const cat = await this.prisma.category.create({
      data: {
        name: newName,
        slug: newSlug,
        description: source.description,
        icon: source.icon,
        imageUrl: source.imageUrl,
        bannerUrl: source.bannerUrl,
        thumbnailUrl: source.thumbnailUrl,
        backgroundColor: source.backgroundColor,
        textColor: source.textColor,
        sortOrder: source.sortOrder + 1,
        status: CategoryStatus.DRAFT,
        isActive: false,
        badge: source.badge as never,
        isFeatured: source.isFeatured,
        isPopular: false,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        analytics: { create: {} },
        settings: { create: {} },
        schedules: {
          create: source.schedules.map((s) => ({
            label: s.label,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      },
      include: categoryInclude,
    });

    await this.log(cat.id, 'DUPLICATED', `Duplicated from "${source.name}"`, userId);
    return this.mapCategory(cat);
  }

  async reorder(ids: string[], userId?: string) {
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.category.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );
    if (ids[0]) await this.log(ids[0], 'REORDERED', 'Category display order updated', userId);
    return { success: true };
  }

  async bulkAction(action: string, ids: string[], userId?: string) {
    if (!ids.length) throw new BadRequestException('No categories selected');

    switch (action) {
      case 'publish':
        await this.prisma.category.updateMany({
          where: { id: { in: ids } },
          data: { status: CategoryStatus.PUBLISHED, isActive: true },
        });
        break;
      case 'hide':
        await this.prisma.category.updateMany({
          where: { id: { in: ids } },
          data: { status: CategoryStatus.HIDDEN },
        });
        break;
      case 'delete':
        await this.prisma.category.deleteMany({ where: { id: { in: ids } } });
        break;
      case 'duplicate':
        for (const id of ids) await this.duplicate(id, userId);
        break;
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }

    return { success: true, action, count: ids.length };
  }

  async getTimeline(id: string) {
    return this.prisma.categoryLog.findMany({
      where: { categoryId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  getInsights() {
    return [
      {
        id: '1',
        type: 'growth',
        message: 'Dosa category sales increased 18% this week.',
        suggestion: 'Keep Dosa featured on homepage.',
        severity: 'positive',
      },
      {
        id: '2',
        type: 'demand',
        message: 'Biryani demand increased 32% during dinner hours.',
        suggestion: 'Feature Biryani on homepage and evening offers.',
        severity: 'positive',
      },
      {
        id: '3',
        type: 'inactive',
        message: 'Meals category has been inactive for 15 days.',
        suggestion: 'Review pricing or re-enable with seasonal badge.',
        severity: 'warning',
      },
    ];
  }

  exportCsv() {
    return this.findAllAdmin({}).then((cats) => {
      const header = 'name,slug,status,items,sortOrder,isFeatured,isPopular\n';
      const rows = cats
        .map(
          (c) =>
            `"${c.name}","${c.slug}","${c.status}",${c.itemCount},${c.sortOrder},${c.isFeatured},${c.isPopular}`,
        )
        .join('\n');
      return header + rows;
    });
  }

  async remove(id: string, userId?: string) {
    const cat = await this.ensureExists(id);
    await this.prisma.category.delete({ where: { id } });
    await this.log(id, 'DELETED', `Category "${cat.name}" deleted`, userId);
    return { success: true };
  }

  private async ensureExists(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}
