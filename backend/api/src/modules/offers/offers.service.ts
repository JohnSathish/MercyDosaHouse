import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = false) {
    const now = new Date();
    return this.prisma.offer
      .findMany({
        where: activeOnly
          ? {
              isActive: true,
              OR: [{ startsAt: null }, { startsAt: { lte: now } }],
              AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
            }
          : undefined,
        orderBy: { sortOrder: 'asc' },
      })
      .then((offers) => offers.map(this.mapOffer));
  }

  findOne(id: string) {
    return this.prisma.offer.findUnique({ where: { id } }).then((o) => {
      if (!o) throw new NotFoundException('Offer not found');
      return this.mapOffer(o);
    });
  }

  create(data: Record<string, unknown>) {
    return this.prisma.offer.create({ data: data as never }).then(this.mapOffer);
  }

  update(id: string, data: Record<string, unknown>) {
    return this.prisma.offer.update({ where: { id }, data: data as never }).then(this.mapOffer);
  }

  delete(id: string) {
    return this.prisma.offer.delete({ where: { id } });
  }

  private mapOffer(offer: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    discountPct: { toNumber?: () => number } | null;
    type: string;
    buttonLabel: string | null;
    buttonUrl: string | null;
    displayPosition: string | null;
    sortOrder: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...offer,
      discountPct: offer.discountPct ? Number(offer.discountPct) : null,
    };
  }
}
