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
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
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
  items: OrderItemDto[];
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
  openingHours: string;
  upiId?: string | null;
  upiQrUrl?: string | null;
  googleMapsEmbed?: string | null;
}

export interface DashboardStatsDto {
  salesToday: number;
  ordersToday: number;
  revenueToday: number;
  customersToday: number;
  pendingOrders: number;
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
