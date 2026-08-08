'use client';

import { Button, cn } from '@mdh/ui';
import { OrderStatus, type KitchenOrderDto } from '@mdh/types';
import { ORDER_STATUS_LABELS } from '@mdh/utils';
import { KitchenTimer } from './kitchen-timer';
import { PriorityBadge } from './priority-badge';
import { ChefHat, CheckCircle2, Play, XCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'border-blue-500/40 bg-blue-500/5',
  ACCEPTED: 'border-blue-500/40 bg-blue-500/5',
  PREPARING: 'border-orange-500/40 bg-orange-500/5',
  READY: 'border-emerald-500/40 bg-emerald-500/5',
  CANCELLED: 'border-red-500/40 bg-red-500/5',
};

interface KitchenOrderCardProps {
  order: KitchenOrderDto;
  muted: boolean;
  onAction: (action: string, orderId: string) => void;
  onSelect: (order: KitchenOrderDto) => void;
  isPending?: boolean;
}

export function KitchenOrderCard({
  order,
  muted,
  onAction,
  onSelect,
  isPending,
}: KitchenOrderCardProps) {
  const isDelivery = order.deliveryAddress && order.deliveryAddress.length > 10;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(order)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(order)}
      className={cn(
        'rounded-2xl border-2 p-4 lg:p-5 cursor-pointer transition-shadow hover:shadow-lg',
        'bg-gray-900/80 backdrop-blur',
        STATUS_COLORS[order.status] ?? 'border-gray-700',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-lg font-bold text-white">#{order.orderNumber}</p>
          {order.tokenNumber && (
            <p className="text-xs text-amber-400 font-semibold">Token #{order.tokenNumber}</p>
          )}
          <p className="text-sm text-gray-300 mt-0.5">{order.customerName}</p>
        </div>
        <PriorityBadge priority={order.priority} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <KitchenTimer
          startedAt={order.kitchenStartedAt}
          createdAt={order.createdAt}
          muted={muted}
        />
        <span className="text-[10px] uppercase font-bold text-gray-500">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <ul className="space-y-1.5 mb-4 min-h-[60px]">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-200">
              {item.productName}
              {item.variantName && ` (${item.variantName})`} ×{item.quantity}
            </span>
            <span
              className={cn(
                'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                item.kitchenStatus === 'READY' && 'bg-emerald-500/20 text-emerald-400',
                item.kitchenStatus === 'PREPARING' && 'bg-orange-500/20 text-orange-400',
                item.kitchenStatus === 'WAITING' && 'bg-gray-500/20 text-gray-400',
              )}
            >
              {item.kitchenStatus}
            </span>
          </li>
        ))}
      </ul>

      {(order.deliveryInstructions || order.items.some((i) => i.specialInstructions)) && (
        <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-xs text-amber-200">
          {order.deliveryInstructions ||
            order.items.find((i) => i.specialInstructions)?.specialInstructions}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500 mb-4">
        <span>{order.paymentMethod}</span>
        <span>•</span>
        <span>{order.paymentStatus}</span>
        <span>•</span>
        <span>{isDelivery ? 'Delivery' : 'Pickup'}</span>
      </div>

      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        {order.status === OrderStatus.PENDING && (
          <>
            <Button
              size="lg"
              disabled={isPending}
              className="min-h-14 flex-1 bg-emerald-600 hover:bg-emerald-700 text-base"
              onClick={() => onAction('accept', order.id)}
            >
              <Play className="h-5 w-5 mr-1" /> Accept
            </Button>
            <Button
              size="lg"
              variant="destructive"
              disabled={isPending}
              className="min-h-14"
              onClick={() => onAction('reject', order.id)}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </>
        )}
        {order.status === OrderStatus.ACCEPTED && (
          <Button
            size="lg"
            disabled={isPending}
            className="min-h-14 flex-1 bg-orange-600 hover:bg-orange-700 text-base"
            onClick={() => onAction('preparing', order.id)}
          >
            <ChefHat className="h-5 w-5 mr-1" /> Start Cooking
          </Button>
        )}
        {order.status === OrderStatus.PREPARING && (
          <Button
            size="lg"
            disabled={isPending}
            className="min-h-14 flex-1 bg-emerald-600 hover:bg-emerald-700 text-base"
            onClick={() => onAction('ready', order.id)}
          >
            <CheckCircle2 className="h-5 w-5 mr-1" /> Mark Ready
          </Button>
        )}
        {order.status === OrderStatus.READY && !order.kitchenCompletedAt && (
          <Button
            size="lg"
            disabled={isPending}
            className="min-h-14 flex-1 bg-gray-600 hover:bg-gray-700 text-base"
            onClick={() => onAction('complete', order.id)}
          >
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}
