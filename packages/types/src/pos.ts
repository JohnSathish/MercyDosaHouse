import type { FoodType, PaymentMethod, OrderStatus } from './enums';

export type PosOrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE_PICKUP' | 'STAFF_MEAL';
export type PosOrderSource = 'WEBSITE' | 'POS' | 'QR_MENU' | 'KIOSK';
export type PosTableStatus =
  'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BILLING' | 'WAITING';
export type PosBillStatus = 'OPEN' | 'HELD' | 'SETTLED' | 'VOIDED' | 'REFUNDED';
export type PosDiscountType =
  'FLAT' | 'PERCENTAGE' | 'ITEM' | 'BILL' | 'HAPPY_HOUR' | 'COUPON' | 'STAFF' | 'MANAGER';

export interface PosFloorDto {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  tables?: PosTableDto[];
}

export interface PosTableDto {
  id: string;
  floorId: string;
  label: string;
  capacity: number;
  status: PosTableStatus;
  posX: number;
  posY: number;
  mergedIntoId?: string | null;
  activeOrderId?: string | null;
}

export interface PosMenuProductDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  packingCharge: number;
  imageUrl?: string | null;
  categoryId: string;
  categoryName: string;
  foodType: FoodType;
  prepTimeMinutes: number;
  isAvailable: boolean;
  isPopular: boolean;
  gstPercent?: number | null;
}

export interface PosMenuCategoryDto {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder: number;
  products: PosMenuProductDto[];
}

export interface PosMenuDto {
  categories: PosMenuCategoryDto[];
}

export interface PosBillItemDto {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitPackingCharge: number;
  packingCharge: number;
  specialInstructions?: string | null;
}

export interface PosBillDto {
  id: string;
  orderNumber: string;
  orderType: PosOrderType;
  billStatus: PosBillStatus;
  status: OrderStatus;
  tableId?: string | null;
  tableLabel?: string | null;
  customerName: string;
  customerPhone: string;
  customerId?: string | null;
  deliveryAddress?: string | null;
  covers?: number | null;
  items: PosBillItemDto[];
  subtotal: number;
  deliveryCharge: number;
  packingCharge: number;
  packedItemCount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  discount: number;
  grandTotal: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: string;
  tokenNumber?: number | null;
  paymentLines?: PosPaymentLineDto[];
  amountReceived?: number;
  changeDue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PosPaymentLineDto {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface PosSettleRequest {
  paymentMethod: PaymentMethod;
  paymentLines?: PosPaymentLineDto[];
  amountReceived?: number;
}

export interface PosCreateBillRequest {
  orderType: PosOrderType;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  deliveryAddress?: string;
  covers?: number;
}

export interface PosAddItemRequest {
  productId: string;
  variantId?: string;
  quantity?: number;
  specialInstructions?: string;
}

export interface PosUpdateItemRequest {
  quantity?: number;
  specialInstructions?: string;
}

export interface PosApplyDiscountRequest {
  type: PosDiscountType;
  amount: number;
  reason?: string;
  managerPin?: string;
}

export interface PosCustomerSnapshotDto {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  lifetimeSpend: number;
  orderCount: number;
  favoriteItems: string[];
  lastOrderAt?: string | null;
}

export interface PosLiveAnalyticsDto {
  revenueToday: number;
  ordersToday: number;
  avgBillValue: number;
  customersToday: number;
  topItems: { productId: string; name: string; quantity: number }[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
  busyHours: { hour: number; orders: number }[];
}

export interface PosSessionDto {
  id: string;
  branchId: string;
  terminalId?: string | null;
  cashierId: string;
  cashierName?: string;
  status: 'OPEN' | 'CLOSED';
  openingFloat: number;
  closingCash?: number | null;
  totalSales: number;
  openedAt: string;
  closedAt?: string | null;
}

export interface PosHoldBillDto {
  id: string;
  label?: string | null;
  tableId?: string | null;
  tableLabel?: string | null;
  orderId?: string | null;
  grandTotal: number;
  itemCount: number;
  createdAt: string;
}

export interface PosBillSummaryDto {
  id: string;
  orderNumber: string;
  billStatus: PosBillStatus;
  orderType: PosOrderType;
  customerName: string;
  customerPhone: string;
  tableLabel?: string | null;
  itemCount: number;
  grandTotal: number;
  paymentMethod?: PaymentMethod;
  createdAt: string;
}

export interface PosReceiptDto extends PosBillDto {
  cashierName?: string;
  branchName?: string;
  gstNumber?: string;
}

export interface PosTableOperationRequest {
  tableIds: string[];
  targetTableId?: string;
}

export interface PosRefundRequest {
  amount: number;
  reason: string;
  managerPin?: string;
  itemIds?: string[];
}

export interface PosShiftReportDto {
  sessionId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string | null;
  openingFloat: number;
  closingCash?: number | null;
  totalSales: number;
  totalRefunds: number;
  totalDiscount: number;
  cashDifference: number;
  orderCount: number;
}

export interface PosOfflineSyncRequest {
  terminalId: string;
  bills: PosCreateBillRequest & { items: PosAddItemRequest[]; localId: string }[];
}
