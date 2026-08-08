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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpSendRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface GoogleAuthRequest {
  idToken: string;
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
}

export interface OrderStatusHistoryDto {
  id: string;
  previousStatus?: OrderStatus | null;
  newStatus: OrderStatus;
  updatedByName?: string | null;
  remarks?: string | null;
  createdAt: string;
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
  discount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  rejectReason?: string | null;
  items: OrderItemDto[];
  statusHistory?: OrderStatusHistoryDto[];
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
export * from './reports';
export * from './activity';
