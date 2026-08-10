'use client';

import { useQuery } from '@tanstack/react-query';
import {
  calculateDeliveryCharge,
  calculateOrderTotal,
  calculatePackingChargeForOrder,
  type OnlineOrderType,
} from '@mdh/utils';
import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
    staleTime: 60_000,
  });
}

export function useOrderCharges(
  subtotal: number,
  packingTotal: number,
  orderType: OnlineOrderType = 'DELIVERY',
  discount = 0,
) {
  const { data: settings } = useBusinessSettings();

  const baseDeliveryCharge = settings?.deliveryCharge ?? 30;
  const freeDeliveryLimit = settings?.freeDeliveryLimit ?? 299;

  const deliveryResult = calculateDeliveryCharge(subtotal, {
    deliveryCharge: baseDeliveryCharge,
    freeDeliveryLimit,
    orderType,
  });

  const packing = calculatePackingChargeForOrder(packingTotal, orderType);
  const total = calculateOrderTotal(subtotal, deliveryResult.amount, packing, discount);

  return {
    settings,
    subtotal,
    delivery: deliveryResult.amount,
    deliveryIsFree: deliveryResult.isFree,
    baseDeliveryCharge,
    freeDeliveryLimit,
    packing,
    total,
    amountToFreeDelivery:
      freeDeliveryLimit > 0 && subtotal < freeDeliveryLimit ? freeDeliveryLimit - subtotal : 0,
  };
}
