import { OrderStatus } from '@prisma/client';

const ALLOWED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  ACCEPTED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.SERVED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  SERVED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return (ALLOWED[from] ?? []).includes(to);
}
