import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  findAll(productId?: string) {
    return this.prisma.review.findMany({
      where: productId ? { productId } : undefined,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, data: { productId?: string; rating: number; comment?: string }) {
    return this.prisma.review.create({
      data: { ...data, userId },
      include: { user: { select: { name: true } } },
    });
  }

  reply(id: string, ownerReply: string) {
    return this.prisma.review.update({ where: { id }, data: { ownerReply } });
  }
}
