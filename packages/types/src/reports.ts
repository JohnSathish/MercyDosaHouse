export type ReportPeriod =
  'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'custom';

export interface ReportsKpiDto {
  revenue: number;
  revenueTrend: number;
  orders: number;
  ordersTrend: number;
  avgOrderValue: number;
  aovTrend: number;
  netProfit: number;
  profitTrend: number;
  foodCost: number;
  cancelled: number;
  preparing: number;
  delivered: number;
  satisfaction: number;
}

export interface ReportsLiveDto {
  kitchenQueue: number;
  deliveryQueue: number;
  revenueToday: number;
  activeOrders: number;
}

export interface ReportsDashboardDto {
  period: string;
  range: { start: string; end: string };
  kpis: ReportsKpiDto;
  live: ReportsLiveDto;
}

export interface SalesAnalyticsDto {
  byHour: { hour: number; revenue: number; orders: number }[];
  byDay: { date: string; revenue: number; orders: number }[];
  weeklyTotal: number;
  forecast: number;
}

export interface OrderAnalyticsDto {
  byStatus: { status: string; count: number }[];
  delivery: number;
  pickup: number;
  refunded: number;
}

export interface ProductPerformanceDto {
  productId: string;
  name: string;
  category: string;
  imageUrl?: string | null;
  orders: number;
  quantity: number;
  revenue: number;
  profit: number;
  prepTimeMinutes: number;
  popularityScore: number;
  rating: number;
}

export interface ReportsCategoryAnalyticsDto {
  name: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface CustomerAnalyticsDto {
  total: number;
  newToday: number;
  vip: number;
  repeat: number;
  inactive: number;
  avgSpend: number;
  lifetimeValue: number;
}

export interface PaymentAnalyticsDto {
  method: string;
  amount: number;
  count: number;
}

export interface DeliveryAnalyticsDto {
  delivered: number;
  pending: number;
  avgDeliveryMinutes: number;
  topExecutive: string;
  failed: number;
}

export interface KitchenAnalyticsDto {
  avgPrepMinutes: number;
  ordersToday: number;
  busiestHour: number;
  efficiency: number;
  delayed: number;
}

export interface InventoryAnalyticsDto {
  stockValue: number;
  lowStock: number;
  wasteCost: number;
  fastMoving: string[];
  slowMoving: string[];
}

export interface ReportInsightDto {
  id: string;
  message: string;
  type: 'positive' | 'info' | 'suggestion' | 'warning';
  category: string;
}

export interface HeatmapDayDto {
  day: string;
  hours: { hour: number; count: number }[];
}
