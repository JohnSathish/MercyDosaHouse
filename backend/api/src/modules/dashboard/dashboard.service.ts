import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      revenueResult,
      pendingOrders,
      cancelledOrders,
      popularItems,
      customersToday,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { not: OrderStatus.CANCELLED } },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({
        where: { status: OrderStatus.CANCELLED, createdAt: { gte: today } },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.order.groupBy({
        by: ['customerPhone'],
        where: { createdAt: { gte: today } },
      }),
    ]);

    return {
      salesToday: ordersToday,
      ordersToday,
      revenueToday: Number(revenueResult._sum.grandTotal || 0),
      customersToday: customersToday.length,
      pendingOrders,
      cancelledOrders,
      popularItems: popularItems.map((p) => ({
        name: p.productName,
        count: p._sum.quantity || 0,
      })),
    };
  }
}
