'use client';

import { Badge, Button } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import type { OrderDto } from '@mdh/types';
import { OrderStatus } from '@mdh/types';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface OrderDrawerProps {
  order: OrderDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (id: string) => void | Promise<void>;
  onReject: (id: string) => void;
  onStatusChange: (id: string, status: OrderStatus) => void | Promise<void>;
  onResendEmail?: (id: string) => void | Promise<void>;
  loading?: boolean;
}

const TIMELINE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

function statusIndex(status: OrderStatus): number {
  return TIMELINE_STATUSES.indexOf(status);
}

export function OrderDrawer({
  order,
  open,
  onOpenChange,
  onAccept,
  onReject,
  onStatusChange,
  onResendEmail,
  loading,
}: OrderDrawerProps) {
  if (!order) return null;

  const email = order.emailNotification;
  const emailStatusLabel =
    email?.status === 'SENT'
      ? 'Sent ✓'
      : email?.status === 'FAILED'
        ? 'Failed'
        : email?.status === 'RETRYING'
          ? 'Retry'
          : 'Pending';

  const historyMap = new Map((order.statusHistory || []).map((h) => [h.newStatus, h]));
  const currentIdx = statusIndex(order.status);

  const runAction = (action: () => void | Promise<void>) => {
    void action();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{order.orderNumber}</SheetTitle>
          <Badge className="w-fit">{ORDER_STATUS_LABELS[order.status]}</Badge>
        </SheetHeader>

        <SheetBody className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Customer Information</h3>
            <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span> {order.customerName}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {order.customerPhone}
              </p>
              <p>
                <span className="text-muted-foreground">Address:</span> {order.deliveryAddress}
              </p>
              {order.deliveryInstructions && (
                <p>
                  <span className="text-muted-foreground">Notes:</span> {order.deliveryInstructions}
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">Ordered Items</h3>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                    {item.variantName ? ` (${item.variantName})` : ''}
                  </span>
                  <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t pt-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{formatCurrency(order.deliveryCharge)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
              <p className="text-muted-foreground pt-1">Payment: {order.paymentMethod}</p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">Email Notification</h3>
            <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                <span
                  className={
                    email?.status === 'SENT'
                      ? 'text-emerald-600 font-medium'
                      : email?.status === 'FAILED'
                        ? 'text-red-600 font-medium'
                        : 'font-medium'
                  }
                >
                  {emailStatusLabel}
                </span>
              </p>
              {email?.sentAt && (
                <p>
                  <span className="text-muted-foreground">Sent at:</span>{' '}
                  {new Date(email.sentAt).toLocaleString()}
                </p>
              )}
              {email?.lastError && <p className="text-red-600 text-xs">Error: {email.lastError}</p>}
              {onResendEmail && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => runAction(() => onResendEmail(order.id))}
                >
                  Resend Order Email
                </Button>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Order Timeline</h3>
            <div className="space-y-3">
              {TIMELINE_STATUSES.map((status) => {
                const entry = historyMap.get(status);
                const idx = statusIndex(status);
                const reached = idx >= 0 && idx <= currentIdx;
                return (
                  <div key={status} className="flex gap-3 items-start">
                    <div
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${reached ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    />
                    <div>
                      <p className={`text-sm font-medium ${reached ? '' : 'text-gray-400'}`}>
                        {ORDER_STATUS_LABELS[status]}
                      </p>
                      {entry && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                          {entry.updatedByName ? ` · ${entry.updatedByName}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {order.rejectReason && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
              Rejected: {order.rejectReason}
            </p>
          )}
        </SheetBody>

        <SheetFooter>
          {order.status === OrderStatus.PENDING && (
            <>
              <Button onClick={() => runAction(() => onAccept(order.id))} disabled={loading}>
                Accept
              </Button>
              <Button variant="destructive" onClick={() => onReject(order.id)} disabled={loading}>
                Reject
              </Button>
            </>
          )}
          {order.status === OrderStatus.ACCEPTED && (
            <Button
              onClick={() => runAction(() => onStatusChange(order.id, OrderStatus.PREPARING))}
              disabled={loading}
            >
              {loading ? 'Updating…' : 'Start Preparing'}
            </Button>
          )}
          {order.status === OrderStatus.PREPARING && (
            <Button
              onClick={() => runAction(() => onStatusChange(order.id, OrderStatus.READY))}
              disabled={loading}
            >
              {loading ? 'Updating…' : 'Mark Ready'}
            </Button>
          )}
          {order.status === OrderStatus.READY && (
            <Button
              onClick={() =>
                runAction(() => onStatusChange(order.id, OrderStatus.OUT_FOR_DELIVERY))
              }
              disabled={loading}
            >
              {loading ? 'Updating…' : 'Assign Delivery'}
            </Button>
          )}
          {order.status === OrderStatus.OUT_FOR_DELIVERY && (
            <Button
              onClick={() => runAction(() => onStatusChange(order.id, OrderStatus.DELIVERED))}
              disabled={loading}
            >
              {loading ? 'Updating…' : 'Mark Delivered'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
