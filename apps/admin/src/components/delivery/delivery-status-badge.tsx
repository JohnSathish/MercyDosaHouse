'use client';

import type { DeliveryAssignmentStatus, DeliveryExecutiveStatus } from '@mdh/types';
import { Badge, cn } from '@mdh/ui';

const ASSIGNMENT_COLORS: Record<DeliveryAssignmentStatus, string> = {
  WAITING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PICKED_UP: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const EXECUTIVE_COLORS: Record<DeliveryExecutiveStatus, string> = {
  ONLINE: 'bg-emerald-100 text-emerald-700',
  OFFLINE: 'bg-gray-100 text-gray-600',
  BUSY: 'bg-amber-100 text-amber-700',
  BREAK: 'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-red-100 text-red-700',
};

const LABELS: Record<DeliveryAssignmentStatus, string> = {
  WAITING: 'Pending',
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryAssignmentStatus | string }) {
  const s = status as DeliveryAssignmentStatus;
  return (
    <Badge
      className={cn('text-[10px] font-semibold', ASSIGNMENT_COLORS[s] ?? ASSIGNMENT_COLORS.WAITING)}
    >
      {LABELS[s] ?? status}
    </Badge>
  );
}

export function ExecutiveStatusBadge({ status }: { status: DeliveryExecutiveStatus }) {
  return (
    <Badge className={cn('text-[10px] font-semibold', EXECUTIVE_COLORS[status])}>{status}</Badge>
  );
}
