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

const FORWARD_CHAIN: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return (ALLOWED[from] ?? []).includes(to);
}

/** Intermediate statuses to apply when kitchen/admin jumps ahead (e.g. PENDING → READY). */
export function getForwardStatusPath(from: OrderStatus, to: OrderStatus): OrderStatus[] | null {
  if (from === to) return [];
  if (to === OrderStatus.CANCELLED || to === OrderStatus.SERVED) {
    return isValidOrderStatusTransition(from, to) ? [to] : null;
  }
  const start = FORWARD_CHAIN.indexOf(from);
  const end = FORWARD_CHAIN.indexOf(to);
  if (start < 0 || end < 0 || end <= start) return null;
  return FORWARD_CHAIN.slice(start + 1, end + 1);
}
