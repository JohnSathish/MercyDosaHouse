import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, FoodType, SpiceLevel } from '@prisma/client';
import { CHICKEN_BIRYANI_SLUG, isChickenDumBiryaniSlug } from '@mdh/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { displayCategoryName } from '../categories/category-display-name';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    categoryId?: string;
    foodType?: FoodType;
    search?: string;
    available?: boolean;
    popular?: boolean;
    featured?: boolean;
    bestseller?: boolean;
    onOffer?: boolean;
    preOrder?: boolean;
    comingSoon?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.foodType) where.foodType = filters.foodType;
    if (filters?.available) where.isAvailable = true;
    if (filters?.popular) where.isPopular = true;
    if (filters?.featured) where.isFeatured = true;
    if (filters?.bestseller) where.isBestseller = true;
    if (filters?.onOffer) where.isOnOffer = true;
    if (filters?.preOrder) where.isPreOrder = true;
    if (filters?.comingSoon) where.isComingSoon = true;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, images: true, variants: true },
        orderBy: [{ isPopular: 'desc' }, { isBestseller: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) => this.mapProduct(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true, variants: true, reviews: { take: 10 } },
    });
    if (!product || product.deletedAt) throw new NotFoundException('Product not found');
    return this.mapProduct(product);
  }

  async findBySlug(slug: string) {
    const include = {
      category: true,
      images: true,
      variants: true,
      reviews: { take: 10 },
    } as const;
    const raw = decodeURIComponent(slug || '').trim();
    let product = await this.prisma.product.findFirst({
      where: { deletedAt: null, slug: raw },
      include,
    });
    if (!product && isChickenDumBiryaniSlug(raw)) {
      product = await this.prisma.product.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { slug: CHICKEN_BIRYANI_SLUG },
            {
              AND: [
                { name: { contains: 'chicken', mode: 'insensitive' } },
                { name: { contains: 'biryani', mode: 'insensitive' } },
              ],
            },
          ],
        },
        include,
        orderBy: { createdAt: 'asc' },
      });
      if (product) {
        this.logger.warn(
          `Resolved Chicken Dum Biryani alias "${raw}" to product slug "${product.slug}" (${product.id})`,
        );
      }
    }
    if (!product) {
      this.logger.warn(`Product not found for slug "${raw}"`);
      throw new NotFoundException('Product not found');
    }
    return this.mapProduct(product);
  }

  create(data: Record<string, unknown>) {
    const payload = this.sanitizeProductData(data);
    if (!payload.slug && payload.name) {
      payload.slug = String(payload.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    return this.prisma.product
      .create({
        data: payload as Prisma.ProductUncheckedCreateInput,
        include: { category: true, images: true, variants: true },
      })
      .then((p) => this.mapProduct(p));
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.ensureExists(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: this.sanitizeProductData(data) as Prisma.ProductUncheckedUpdateInput,
      include: { category: true, images: true, variants: true },
    });
    return this.mapProduct(product);
  }

  async remove(id: string) {
    const product = await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { productId: id } }),
      this.prisma.favorite.deleteMany({ where: { productId: id } }),
      this.prisma.product.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isAvailable: false,
          isComingSoon: false,
          isPopular: false,
          isFeatured: false,
          isBestseller: false,
          isOnOffer: false,
          isPreOrder: false,
          slug: `${product.slug}-deleted-${Date.now()}`,
        },
      }),
    ]);
    return { success: true };
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new NotFoundException('Product not found');
    return product;
  }

  private sanitizeProductData(data: Record<string, unknown>) {
    const aliases: Record<string, string> = {
      foodType: 'foodType',
      spiceLevel: 'spiceLevel',
      prepTimeMinutes: 'prepTimeMinutes',
      isAvailable: 'isAvailable',
    };
    const allowed = new Set([
      'name',
      'slug',
      'description',
      'price',
      'packingCharge',
      'imageUrl',
      'categoryId',
      'foodType',
      'spiceLevel',
      'prepTimeMinutes',
      'isAvailable',
      'isPopular',
      'isFeatured',
      'isBestseller',
      'isOnOffer',
      'isPreOrder',
      'isComingSoon',
      'ingredients',
      'nutritionInfo',
      'seoTitle',
      'seoDescription',
      'imageAltText',
    ]);
    const decimals = new Set(['price', 'packingCharge']);
    const spiceMap: Record<string, string> = {
      EXTRA_HOT: 'EXTRA_HOT',
    };
    const sanitized: Record<string, unknown> = {};
    for (const [rawKey, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const key = aliases[rawKey] ?? rawKey;
      if (!allowed.has(key)) continue;
      if (decimals.has(key)) {
        sanitized[key] = Number(value);
      } else if (key === 'spiceLevel' && typeof value === 'string') {
        sanitized[key] = spiceMap[value] ?? value;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private mapProduct(product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: Prisma.Decimal;
    packingCharge: Prisma.Decimal;
    imageUrl: string | null;
    categoryId: string;
    category?: { id: string; name: string; slug: string } | null;
    foodType: FoodType;
    spiceLevel: SpiceLevel;
    prepTimeMinutes: number;
    isAvailable: boolean;
    isPopular: boolean;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isOnOffer?: boolean;
    isPreOrder?: boolean;
    isComingSoon?: boolean;
    ingredients: string | null;
    nutritionInfo: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    imageAltText?: string | null;
    images?: { url: string }[];
    variants?: { id: string; name: string; price: Prisma.Decimal; isAvailable: boolean }[];
  }) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      packingCharge: Number(product.packingCharge ?? 20),
      imageUrl: product.imageUrl,
      images: product.images?.map((i) => i.url) || [],
      categoryId: product.categoryId,
      category: product.category
        ? {
            ...product.category,
            name: displayCategoryName(product.category.name, product.category.slug),
          }
        : product.category,
      foodType: product.foodType,
      spiceLevel: product.spiceLevel,
      prepTimeMinutes: product.prepTimeMinutes,
      isAvailable: product.isAvailable,
      isPopular: product.isPopular,
      isFeatured: product.isFeatured ?? false,
      isBestseller: product.isBestseller ?? false,
      isOnOffer: product.isOnOffer ?? false,
      isPreOrder: product.isPreOrder ?? false,
      isComingSoon: product.isComingSoon ?? false,
      ingredients: product.ingredients,
      nutritionInfo: product.nutritionInfo,
      seoTitle: product.seoTitle ?? null,
      seoDescription: product.seoDescription ?? null,
      imageAltText: product.imageAltText ?? null,
      variants: product.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        isAvailable: v.isAvailable,
      })),
    };
  }
}
