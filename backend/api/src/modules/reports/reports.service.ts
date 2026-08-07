import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dailySales(date?: string) {
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);
    const next = new Date(target);
    next.setDate(next.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: target, lt: next },
        status: { not: OrderStatus.CANCELLED },
      },
      include: { items: true },
    });

    return {
      date: target.toISOString().split('T')[0],
      orderCount: orders.length,
      revenue: orders.reduce((sum, o) => sum + Number(o.grandTotal), 0),
      orders,
    };
  }

  async monthlySales(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const result = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        status: { not: OrderStatus.CANCELLED },
      },
      _count: true,
      _sum: { grandTotal: true },
    });

    return {
      year,
      month,
      orderCount: result._count,
      revenue: Number(result._sum.grandTotal || 0),
    };
  }

  async topProducts(limit = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productName'],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    return items.map((i) => ({
      name: i.productName,
      quantity: i._sum.quantity || 0,
      revenue: Number(i._sum.totalPrice || 0),
    }));
  }

  async cancelledOrders() {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.CANCELLED },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
