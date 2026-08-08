export enum InventoryUnit {
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  PIECE = 'PIECE',
  PACKET = 'PACKET',
  BOTTLE = 'BOTTLE',
  TRAY = 'TRAY',
  DOZEN = 'DOZEN',
  BUNDLE = 'BUNDLE',
}

export enum InventoryItemStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum StockAdjustmentReason {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  CORRECTION = 'CORRECTION',
  DAMAGE = 'DAMAGE',
  SAMPLE = 'SAMPLE',
  LOSS = 'LOSS',
}

export enum WasteReason {
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
  KITCHEN_WASTE = 'KITCHEN_WASTE',
  SPILLAGE = 'SPILLAGE',
  RETURNED = 'RETURNED',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
}

export interface InventoryStatsDto {
  stockValue: number;
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  purchaseToday: number;
  consumptionToday: number;
}

export interface InventoryItemDto {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId: string;
  categoryName: string;
  unit: InventoryUnit;
  currentStock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  costPrice: number;
  averageCost: number;
  stockValue: number;
  supplierId?: string | null;
  supplierName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  expiryTracking: boolean;
  status: InventoryItemStatus;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryDashboardDto {
  stats: InventoryStatsDto;
  consumptionChart: Array<{ date: string; value: number }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStock: number;
    unit: string;
    status: string;
  }>;
  recentPurchases: Array<{
    id: string;
    poNumber: string;
    supplier: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  recentAdjustments: Array<{
    id: string;
    item: string;
    quantity: number;
    reason: string;
    createdAt: string;
  }>;
  topConsumed: Array<{ name: string; quantity: number }>;
}
