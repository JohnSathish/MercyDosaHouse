import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { PaymentMethod } from '@mdh/types';
import type { CheckoutSessionState, DeliveryTiming, AddressDto } from '@mdh/types';

interface CheckoutStore extends CheckoutSessionState {
  deliveryInstructions: string;
  setSelectedAddressId: (id: string | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDeliveryTiming: (timing: DeliveryTiming) => void;
  setScheduledDate: (date: string | null) => void;
  setScheduledSlot: (slot: string | null) => void;
  setCouponCode: (code: string | null) => void;
  setRewardPointsToUse: (points: number) => void;
  setGuestAddressDraft: (draft: Partial<AddressDto> | null) => void;
  setDeliveryInstructions: (text: string) => void;
  resetSession: () => void;
}

const DEFAULT: CheckoutSessionState & { deliveryInstructions: string } = {
  selectedAddressId: null,
  paymentMethod: PaymentMethod.COD,
  deliveryTiming: 'now',
  scheduledDate: null,
  scheduledSlot: null,
  couponCode: null,
  rewardPointsToUse: 0,
  guestAddressDraft: null,
  deliveryInstructions: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...DEFAULT,
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setDeliveryTiming: (timing) => set({ deliveryTiming: timing }),
      setScheduledDate: (date) => set({ scheduledDate: date }),
      setScheduledSlot: (slot) => set({ scheduledSlot: slot }),
      setCouponCode: (code) => set({ couponCode: code }),
      setRewardPointsToUse: (points) => set({ rewardPointsToUse: points }),
      setGuestAddressDraft: (draft) => set({ guestAddressDraft: draft }),
      setDeliveryInstructions: (text) => set({ deliveryInstructions: text }),
      resetSession: () => set(DEFAULT),
    }),
    {
      name: 'mdh-mobile-checkout',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
