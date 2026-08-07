export const BRAND = {
  name: 'Mercy Dosa House',
  tagline: 'Freshly Made. Delivered with Love.',
  primary: '#0F5132',
  secondary: '#F59E0B',
  accent: '#FFF7E6',
  background: '#FFFFFF',
} as const;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatOrderNumber(year: number, sequence: number): string {
  return `MDH-${year}${String(sequence).padStart(6, '0')}`;
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

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
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
