import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(1);

    const notCancelled = { status: { not: OrderStatus.CANCELLED } };

    const [
      ordersToday,
      revenueTodayResult,
      revenueWeekResult,
      revenueMonthResult,
      pendingOrders,
      preparingOrders,
      readyOrders,
      outForDeliveryOrders,
      deliveredToday,
      cancelledOrders,
      popularItems,
      customersToday,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, ...notCancelled },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: weekStart }, ...notCancelled },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, ...notCancelled },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PREPARING } }),
      this.prisma.order.count({ where: { status: OrderStatus.READY } }),
      this.prisma.order.count({ where: { status: OrderStatus.OUT_FOR_DELIVERY } }),
      this.prisma.order.count({
        where: { status: OrderStatus.DELIVERED, updatedAt: { gte: today } },
      }),
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
      revenueToday: Number(revenueTodayResult._sum.grandTotal || 0),
      revenueWeek: Number(revenueWeekResult._sum.grandTotal || 0),
      revenueMonth: Number(revenueMonthResult._sum.grandTotal || 0),
      customersToday: customersToday.length,
      pendingOrders,
      preparingOrders,
      readyOrders,
      outForDeliveryOrders,
      deliveredToday,
      cancelledOrders,
      popularItems: popularItems.map((p) => ({
        name: p.productName,
        count: p._sum.quantity || 0,
      })),
    };
  }
}
