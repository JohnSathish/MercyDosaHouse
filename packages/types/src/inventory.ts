export enum InventoryUnit {
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  PIECE = 'PIECE',
  PACKET = 'PACKET',
  BOX = 'BOX',
  BOTTLE = 'BOTTLE',
  TRAY = 'TRAY',
  DOZEN = 'DOZEN',
  BUNDLE = 'BUNDLE',
  CUSTOM = 'CUSTOM',
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
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
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
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
}

export enum WasteReason {
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
  KITCHEN_WASTE = 'KITCHEN_WASTE',
  SPILLAGE = 'SPILLAGE',
  RETURNED = 'RETURNED',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  SPOILAGE = 'SPOILAGE',
  COOKING_LOSS = 'COOKING_LOSS',
  OVERPRODUCTION = 'OVERPRODUCTION',
  OTHER = 'OTHER',
}

export interface InventoryStatsDto {
  stockValue: number;
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  purchaseToday: number;
  purchaseThisMonth: number;
  consumptionToday: number;
  stockUsedToday: number;
  wasteThisMonth: number;
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
  customUnit?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
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
  recentMovements: Array<{
    id: string;
    item: string;
    type: string;
    quantity: number;
    afterQty: number;
    reference: string | null;
    createdAt: string;
  }>;
  expiringIngredients: Array<{
    id: string;
    itemName: string;
    remainingQty: number;
    unit: string;
    expiryDate: string | null;
    daysLeft: number | null;
  }>;
  inventoryValue: Array<{ name: string; quantity: number; unit: string; value: number }>;
}
