export const BRAND = {
  name: 'Mercy Dosa House',
  tagline: 'Freshly Made. Delivered With Love.',
  primary: '#14532D',
  secondary: '#F59E0B',
  accent: '#FFF8E8',
  background: '#FFFFFF',
  darkText: '#1F2937',
} as const;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatOrderNumber(dateKey: number | string, sequence: number): string {
  return `MDH-${dateKey}-${String(sequence).padStart(6, '0')}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function calculateOrderTotal(
  subtotal: number,
  deliveryCharge: number,
  packingCharge: number,
  discount = 0,
): number {
  return Math.max(0, subtotal + deliveryCharge + packingCharge - discount);
}

export type OnlineOrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE_PICKUP';

export interface DeliveryChargeOptions {
  deliveryCharge: number;
  freeDeliveryLimit?: number | null;
  orderType?: OnlineOrderType;
}

export interface DeliveryChargeResult {
  amount: number;
  isFree: boolean;
  freeDeliveryLimit: number;
}

/** Delivery fee for online orders — dine-in excluded; free when subtotal meets threshold. */
export function calculateDeliveryCharge(
  subtotal: number,
  options: DeliveryChargeOptions,
): DeliveryChargeResult {
  const orderType = options.orderType ?? 'DELIVERY';
  const freeDeliveryLimit = options.freeDeliveryLimit ?? 299;
  const baseCharge = options.deliveryCharge ?? 30;

  if (orderType === 'DINE_IN' || orderType === 'ONLINE_PICKUP' || orderType === 'TAKEAWAY') {
    return { amount: 0, isFree: true, freeDeliveryLimit };
  }

  if (freeDeliveryLimit > 0 && subtotal >= freeDeliveryLimit) {
    return { amount: 0, isFree: true, freeDeliveryLimit };
  }

  return { amount: baseCharge, isFree: false, freeDeliveryLimit };
}

/** Packing applies to takeaway and delivery; not dine-in. */
export function calculatePackingChargeForOrder(
  packingTotal: number,
  orderType: OnlineOrderType = 'DELIVERY',
): number {
  if (orderType === 'DINE_IN') return 0;
  return packingTotal;
}

export const DEFAULT_PACKING_CHARGE_PER_ITEM = 20;

/** Per-item packing: sum of (packingCharge × quantity) for each cart/order line */
export interface PackingLineItem {
  quantity: number;
  packingCharge?: number | null;
}

export function calculatePackingTotal(items: PackingLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.packingCharge ?? 20) * item.quantity, 0);
}

export function calculatePackedItemCount(items: Pick<PackingLineItem, 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatPackingLabel(packedItemCount: number): string {
  const n = packedItemCount;
  return `Packing (${n} Item${n === 1 ? '' : 's'})`;
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  return phone;
}

export function getWhatsAppOrderUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const fullPhone = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export * from './billing';
export * from './pre-order';
export * from './upi-qr';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Cash on Delivery',
  UPI: 'UPI',
  RAZORPAY: 'Razorpay',
  CASHFREE: 'Cashfree',
  CASH: 'Cash',
  CARD: 'Card',
  WALLET: 'Wallet',
  SPLIT: 'Split Payment',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const SPICE_LEVEL_LABELS: Record<string, string> = {
  MILD: 'Mild',
  MEDIUM: 'Medium',
  HOT: 'Hot',
  EXTRA_HOT: 'Extra Hot',
};

export const FOOD_TYPE_LABELS: Record<string, string> = {
  VEG: 'Veg',
  NON_VEG: 'Non Veg',
};

export {
  allocateHomeCatalog,
  availableForSale,
  productHomeBadge,
  type HomeCatalogProduct,
  type HomeCatalogOptions,
  type HomeCatalogAllocation,
} from './home-catalog';
