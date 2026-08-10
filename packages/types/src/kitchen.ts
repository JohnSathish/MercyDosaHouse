import { OrderStatus, PaymentMethod, PaymentStatus } from './enums';

export enum KitchenPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  VIP = 'VIP',
  EXPRESS = 'EXPRESS',
}

export enum KitchenItemStatus {
  WAITING = 'WAITING',
  PREPARING = 'PREPARING',
  READY = 'READY',
}

export interface KitchenStationDto {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface KitchenOrderItemDto {
  id: string;
  productId: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  kitchenStatus: KitchenItemStatus;
  specialInstructions?: string | null;
  stationSlug?: string | null;
  stationName?: string | null;
}

export interface KitchenOrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryInstructions?: string | null;
  subtotal: number;
  deliveryCharge: number;
  packingCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  rejectReason?: string | null;
  tokenNumber?: number | null;
  priority: KitchenPriority;
  orderType?: string | null;
  tableLabel?: string | null;
  kitchenStartedAt?: string | null;
  kitchenCompletedAt?: string | null;
  queuePosition: number;
  createdAt: string;
  updatedAt: string;
  items: KitchenOrderItemDto[];
}

export interface KitchenStatsDto {
  activeOrders: number;
  preparing: number;
  ready: number;
  completedToday: number;
  avgPrepMinutes: number;
  overdue: number;
}

export interface KitchenDashboardDto {
  stats: KitchenStatsDto;
  orders: KitchenOrderDto[];
}

export type KitchenStatusFilter = 'all' | 'new' | 'preparing' | 'ready' | 'completed';
