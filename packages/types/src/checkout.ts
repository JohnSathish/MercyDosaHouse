import { PaymentMethod } from './enums';
import type { LoyaltyTier } from './customers';
import type { AddressDto } from './address';

export type DeliveryTiming = 'now' | 'scheduled';

export interface CheckoutProfileDto {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  preferredPayment?: PaymentMethod | null;
  preferredDelivery?: string | null;
  addresses: AddressDto[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    deliveryAddress: string;
  }>;
}

export interface AvailableCouponDto {
  id: string;
  name: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  discount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  description?: string | null;
}

export interface CheckoutSessionState {
  selectedAddressId: string | null;
  paymentMethod: PaymentMethod;
  deliveryTiming: DeliveryTiming;
  scheduledDate: string | null;
  scheduledSlot: string | null;
  couponCode: string | null;
  rewardPointsToUse: number;
  guestAddressDraft: Partial<AddressDto> | null;
}

export const DELIVERY_TIME_SLOTS = [
  '8:00 AM - 9:00 AM',
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '1:00 PM - 2:00 PM',
  '6:00 PM - 7:00 PM',
  '7:00 PM - 8:00 PM',
  '8:00 PM - 9:00 PM',
  '9:00 PM - 10:00 PM',
] as const;

export const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: PaymentMethod.COD, label: 'Cash on Delivery', icon: '💵' },
  { value: PaymentMethod.UPI, label: 'UPI', icon: '📱' },
  { value: PaymentMethod.RAZORPAY, label: 'Credit / Debit Card', icon: '💳' },
  { value: PaymentMethod.CASHFREE, label: 'Net Banking / Wallet', icon: '🏦' },
];
