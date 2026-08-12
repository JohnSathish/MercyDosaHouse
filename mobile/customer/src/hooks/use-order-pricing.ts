import {
  calculateDeliveryCharge,
  calculateOrderTotal,
  calculatePackingChargeForOrder,
  calculatePreOrderDiscount,
  buildScheduledDeliveryIso,
} from '@mdh/utils';
import { useMemo } from 'react';
import { useAppConfig } from '@/providers/config-context';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutStore } from '@/stores/checkout-store';

export function useOrderPricing(couponDiscount = 0) {
  const config = useAppConfig();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const packingTotal = useCartStore((s) => s.packingTotal());
  const session = useCheckoutStore();

  return useMemo(() => {
    const baseDeliveryCharge = config.delivery.deliveryCharge;
    const freeDeliveryLimit = config.delivery.freeDeliveryLimit ?? 299;

    const deliveryResult = calculateDeliveryCharge(subtotal, {
      deliveryCharge: baseDeliveryCharge,
      freeDeliveryLimit,
      orderType: 'DELIVERY',
    });

    const packing = calculatePackingChargeForOrder(packingTotal, 'DELIVERY');

    const scheduledIso =
      session.deliveryTiming === 'scheduled' && session.scheduledDate && session.scheduledSlot
        ? buildScheduledDeliveryIso(session.scheduledDate, session.scheduledSlot)
        : null;

    const preOrderConfig = {
      discountPct: config.delivery.preOrderDiscountPct,
      minDaysAhead: config.delivery.preOrderMinDaysAhead,
      stackWithCoupons: config.delivery.preOrderStackWithCoupons,
    };

    const couponsBlocked =
      !config.delivery.preOrderStackWithCoupons &&
      scheduledIso &&
      calculatePreOrderDiscount(subtotal, scheduledIso, preOrderConfig) > 0;

    const preOrderDiscount = couponsBlocked
      ? 0
      : calculatePreOrderDiscount(subtotal, scheduledIso, preOrderConfig);

    const effectiveCoupon = couponsBlocked ? 0 : couponDiscount;
    const rewardDiscount = session.rewardPointsToUse;
    const totalDiscount = preOrderDiscount + effectiveCoupon + rewardDiscount;

    const grandTotal = calculateOrderTotal(subtotal, deliveryResult.amount, packing, totalDiscount);

    return {
      subtotal,
      packingTotal: packing,
      delivery: deliveryResult.amount,
      deliveryIsFree: deliveryResult.isFree,
      baseDeliveryCharge,
      preOrderDiscount,
      couponDiscount: effectiveCoupon,
      rewardDiscount,
      totalDiscount,
      /** Alias for UI bill rows */
      discount: totalDiscount,
      grandTotal,
      scheduledIso,
      couponsBlocked,
      freeDeliveryLimit,
      amountToFreeDelivery:
        freeDeliveryLimit > 0 && subtotal < freeDeliveryLimit ? freeDeliveryLimit - subtotal : 0,
    };
  }, [config, items, subtotal, packingTotal, session, couponDiscount]);
}
