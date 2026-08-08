'use client';

import { Button, cn } from '@mdh/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@mdh/utils';
import type { KitchenItemStatus, KitchenOrderDto } from '@mdh/types';
import { KitchenTimer } from './kitchen-timer';
import { PriorityBadge } from './priority-badge';
import { MapPin, Phone, CreditCard } from 'lucide-react';

interface KitchenOrderDrawerProps {
  order: KitchenOrderDto | null;
  open: boolean;
  onClose: () => void;
  muted: boolean;
  onItemStatus: (orderId: string, itemId: string, status: KitchenItemStatus) => void;
}

const ITEM_STATUSES = [
  'WAITING',
  'PREPARING',
  'READY',
] as const satisfies readonly KitchenItemStatus[];

export function KitchenOrderDrawer({
  order,
  open,
  onClose,
  muted,
  onItemStatus,
}: KitchenOrderDrawerProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 text-white border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Order #{order.orderNumber}</span>
            <PriorityBadge priority={order.priority} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {order.tokenNumber && (
            <p className="text-amber-400 font-bold text-lg">Token #{order.tokenNumber}</p>
          )}

          <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
            <div>
              <p className="font-semibold">{order.customerName}</p>
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
              </p>
            </div>
            <KitchenTimer
              startedAt={order.kitchenStartedAt}
              createdAt={order.createdAt}
              muted={muted}
            />
          </div>

          <div className="text-sm text-gray-400 flex items-start gap-2">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{order.deliveryAddress}</span>
          </div>

          {order.deliveryInstructions && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-200">
              {order.deliveryInstructions}
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Items</h4>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="rounded-lg bg-gray-800 p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {item.productName} ×{item.quantity}
                      </p>
                      {item.stationName && (
                        <p className="text-xs text-gray-500">{item.stationName}</p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs text-amber-300 mt-1">{item.specialInstructions}</p>
                      )}
                    </div>
                    <span className="font-bold">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {ITEM_STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={item.kitchenStatus === s ? 'default' : 'outline'}
                        className={cn(
                          'h-8 text-[10px]',
                          item.kitchenStatus === s && 'bg-[#14532D]',
                        )}
                        onClick={() => onItemStatus(order.id, item.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CreditCard className="h-4 w-4" />
            {order.paymentMethod} — {order.paymentStatus}
          </div>

          <div className="flex justify-between font-bold text-lg border-t border-gray-700 pt-3">
            <span>Total</span>
            <span className="text-[#F59E0B]">{formatCurrency(order.grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
