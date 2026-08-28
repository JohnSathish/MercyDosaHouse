import {
  FoodType,
  SpiceLevel,
  PaymentMethod,
  OrderStatus,
  TrackingStatus,
  PaymentStatus,
  CouponType,
} from './enums';

export * from './enums';
export * from './restaurant-status';
export * from './auth';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AddressDto {
  id?: string;
  contactName: string;
  mobileNumber: string;
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  deliveryNotes?: string;
  addressType?: import('./enums').AddressType;
  isDefault?: boolean;
}

export interface DeliveryPincodeCheckDto {
  available: boolean;
  pincode: string;
  estimatedMinutes: number;
  message: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductVariantDto {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  images?: string[];
  categoryId: string;
  category?: CategoryDto;
  foodType: FoodType;
  spiceLevel: SpiceLevel;
  prepTimeMinutes: number;
  isAvailable: boolean;
  isPopular: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isOnOffer?: boolean;
  isPreOrder?: boolean;
  isComingSoon?: boolean;
  packingCharge?: number;
  ingredients?: string | null;
  nutritionInfo?: string | null;
  variants?: ProductVariantDto[];
}

export interface CartItemDto {
  productId: string;
  variantId?: string;
  quantity: number;
  product?: ProductDto;
}

export interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  address: AddressDto;
  deliveryInstructions?: string;
  paymentMethod: PaymentMethod;
  items: { productId: string; variantId?: string; quantity: number }[];
  couponCode?: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitPackingCharge?: number;
  packingCharge?: number;
}

export interface OrderStatusHistoryDto {
  id: string;
  previousStatus?: OrderStatus | null;
  newStatus: OrderStatus;
  updatedByName?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export interface OrderEmailNotificationDto {
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
  attemptCount: number;
  lastError?: string | null;
  sentAt?: string | null;
  recipients: string[];
  updatedAt?: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  trackingStatus?: TrackingStatus | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryInstructions?: string | null;
  subtotal: number;
  deliveryCharge: number;
  packingCharge: number;
  packedItemCount?: number;
  discount: number;
  preOrderDiscount?: number;
  scheduledDeliveryAt?: string | null;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  rejectReason?: string | null;
  items: OrderItemDto[];
  statusHistory?: OrderStatusHistoryDto[];
  emailNotification?: OrderEmailNotificationDto;
  estimatedDeliveryMinutes?: number;
  statusMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettingsDto {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  deliveryCharge: number;
  packingCharge: number;
  minOrderAmount: number;
  freeDeliveryLimit?: number;
  deliveryRadiusKm?: number;
  estimatedDeliveryMinutes?: number;
  openingHours: string;
  deliveryHours?: string | null;
  upiId?: string | null;
  upiQrUrl?: string | null;
  googleMapsEmbed?: string | null;
  announcementBar?: string | null;
  footerCopyright?: string | null;
  socialLinks?: Record<string, string> | null;
  gstNumber?: string | null;
  websiteUrl?: string | null;
  receiptShowLogo?: boolean;
  receiptShowQr?: boolean;
  receiptShowGst?: boolean;
  receiptShowAddress?: boolean;
  receiptShowCustomer?: boolean;
  receiptShowCashier?: boolean;
  receiptShowPayment?: boolean;
  receiptFooterMessage?: string | null;
  receiptFontSize?: 'small' | 'normal' | 'large';
  receiptPaperWidth?: '58mm' | '80mm';
  receiptCopies?: number;
  receiptAutoPrintPayment?: boolean;
  receiptAutoPrintKot?: boolean;
  preOrderDiscountPct?: number;
  preOrderMinDaysAhead?: number;
  preOrderStackWithCoupons?: boolean;
  storeOpen?: boolean;
  storeClosedMessage?: string | null;
  storeReopenMessage?: string | null;
  storeClosedReason?: string | null;
  storeStatusChangedAt?: string | null;
  storeStatusChangedByName?: string | null;
  operatingSchedule?: import('./restaurant-status').OperatingScheduleDto | null;
}

export interface DashboardStatsDto {
  salesToday: number;
  ordersToday: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  customersToday: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  outForDeliveryOrders: number;
  deliveredToday: number;
  cancelledOrders: number;
  popularItems: { name: string; count: number }[];
}

export interface ReviewDto {
  id: string;
  productId?: string | null;
  userId: string;
  userName: string;
  rating: number;
  comment?: string | null;
  photos?: string[];
  ownerReply?: string | null;
  createdAt: string;
}

export interface CouponDto {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  isActive: boolean;
  expiresAt?: string | null;
}

export interface BannerDto {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export * from './schemas';
export * from './cms';
export * from './kitchen';
export * from './customers';
export * from './inventory';
export * from './delivery';
export * from './categories';
export * from './mobile';
export * from './reports';
export * from './activity';
export * from './checkout';
export * from './pos';
export * from './marketing';
export * from './notifications';
