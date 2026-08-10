import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, FoodType, SpiceLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    categoryId?: string;
    foodType?: FoodType;
    search?: string;
    available?: boolean;
    popular?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: Prisma.ProductWhereInput = {};

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.foodType) where.foodType = filters.foodType;
    if (filters?.available) where.isAvailable = true;
    if (filters?.popular) where.isPopular = true;
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
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map(this.mapProduct),
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
    if (!product) throw new NotFoundException('Product not found');
    return this.mapProduct(product);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true, images: true, variants: true, reviews: { take: 10 } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.mapProduct(product);
  }

  create(data: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    packingCharge?: number;
    categoryId: string;
    foodType?: FoodType;
    spiceLevel?: SpiceLevel;
    prepTimeMinutes?: number;
    isAvailable?: boolean;
    isPopular?: boolean;
    ingredients?: string;
    nutritionInfo?: string;
  }) {
    return this.prisma.product
      .create({
        data: { ...data, price: data.price },
        include: { category: true, images: true, variants: true },
      })
      .then(this.mapProduct);
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.ensureExists(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUpdateInput,
      include: { category: true, images: true, variants: true },
    });
    return this.mapProduct(product);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
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
    ingredients: string | null;
    nutritionInfo: string | null;
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
      category: product.category,
      foodType: product.foodType,
      spiceLevel: product.spiceLevel,
      prepTimeMinutes: product.prepTimeMinutes,
      isAvailable: product.isAvailable,
      isPopular: product.isPopular,
      ingredients: product.ingredients,
      nutritionInfo: product.nutritionInfo,
      variants: product.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        isAvailable: v.isAvailable,
      })),
    };
  }
}
