import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = false) {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  create(data: {
    name: string;
    slug: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.category.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      imageUrl: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
  }
}
