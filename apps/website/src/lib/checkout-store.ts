import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod } from '@mdh/types';
import type { CheckoutSessionState, DeliveryTiming } from '@mdh/types';
import type { AddressDto } from '@mdh/types';

interface CheckoutStore extends CheckoutSessionState {
  setSelectedAddressId: (id: string | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDeliveryTiming: (timing: DeliveryTiming) => void;
  setScheduledDate: (date: string | null) => void;
  setScheduledSlot: (slot: string | null) => void;
  setCouponCode: (code: string | null) => void;
  setRewardPointsToUse: (points: number) => void;
  setGuestAddressDraft: (draft: Partial<AddressDto> | null) => void;
  resetSession: () => void;
}

const DEFAULT_STATE: CheckoutSessionState = {
  selectedAddressId: null,
  paymentMethod: PaymentMethod.COD,
  deliveryTiming: 'now',
  scheduledDate: null,
  scheduledSlot: null,
  couponCode: null,
  rewardPointsToUse: 0,
  guestAddressDraft: null,
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setDeliveryTiming: (timing) => set({ deliveryTiming: timing }),
      setScheduledDate: (date) => set({ scheduledDate: date }),
      setScheduledSlot: (slot) => set({ scheduledSlot: slot }),
      setCouponCode: (code) => set({ couponCode: code }),
      setRewardPointsToUse: (points) => set({ rewardPointsToUse: points }),
      setGuestAddressDraft: (draft) => set({ guestAddressDraft: draft }),
      resetSession: () => set(DEFAULT_STATE),
    }),
    { name: 'mdh-checkout-session' },
  ),
);
