'use client';

import { formatCurrency } from '@mdh/utils';
import { cn } from '@mdh/ui';

interface OrderChargesCardProps {
  baseDeliveryCharge: number;
  packingPerOrder?: number;
  deliveryIsFree?: boolean;
  freeDeliveryLimit?: number;
  className?: string;
  compact?: boolean;
}

/** Static info card — rates from admin settings. */
export function OrderChargesInfoCard({
  baseDeliveryCharge,
  packingPerOrder = 20,
  deliveryIsFree,
  freeDeliveryLimit,
  className,
  compact,
}: OrderChargesCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#14532D]/10 bg-white/80 backdrop-blur-sm shadow-sm',
        compact ? 'p-3' : 'p-4',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[#14532D] mb-2">
        Order Charges
      </p>
      <div className={cn('space-y-1.5 text-sm', compact && 'text-xs')}>
        <p className="flex items-center gap-2 text-gray-700">
          <span>🍱</span>
          <span>
            Packing: <strong className="text-[#1F2937]">{formatCurrency(packingPerOrder)}</strong>
            <span className="text-gray-500 font-normal"> / item</span>
          </span>
        </p>
        <p className="flex items-center gap-2 text-gray-700">
          <span>🛵</span>
          <span>
            Delivery:{' '}
            {deliveryIsFree ? (
              <strong className="text-emerald-700">Free Delivery</strong>
            ) : (
              <strong className="text-[#1F2937]">{formatCurrency(baseDeliveryCharge)}</strong>
            )}
          </span>
        </p>
        {freeDeliveryLimit && freeDeliveryLimit > 0 && !deliveryIsFree && (
          <p className="text-xs text-[#F59E0B] pt-1">
            Free delivery on orders above {formatCurrency(freeDeliveryLimit)}
          </p>
        )}
      </div>
    </div>
  );
}

interface OrderSummaryLinesProps {
  subtotal: number;
  delivery: number;
  packing: number;
  total: number;
  deliveryIsFree?: boolean;
  packedItemCount?: number;
  showPacking?: boolean;
  className?: string;
}

export function OrderSummaryLines({
  subtotal,
  delivery,
  packing,
  total,
  deliveryIsFree,
  packedItemCount,
  showPacking = true,
  className,
}: OrderSummaryLinesProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Delivery</span>
        <span className={deliveryIsFree ? 'text-emerald-700 font-semibold' : ''}>
          {deliveryIsFree || delivery === 0 ? 'Free Delivery' : formatCurrency(delivery)}
        </span>
      </div>
      {showPacking && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            Packing
            {packedItemCount ? ` (${packedItemCount} item${packedItemCount === 1 ? '' : 's'})` : ''}
          </span>
          <span>{formatCurrency(packing)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed">
        <span>Total</span>
        <span className="text-[#14532D]">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
