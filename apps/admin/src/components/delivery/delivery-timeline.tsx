'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@mdh/ui';

const STEPS = [
  { key: 'ORDER_CREATED', label: 'Order Accepted' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready for Pickup' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'OUT_FOR_DELIVERY', label: 'On Route' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function DeliveryTimeline({
  events,
  compact,
}: {
  events?: { type: string; description: string; createdAt: string }[];
  compact?: boolean;
}) {
  const completed = new Set(events?.map((e) => e.type) ?? ['ORDER_CREATED', 'PREPARING']);

  return (
    <div className={cn('space-y-0', compact && 'space-y-1')}>
      {STEPS.map((step, i) => {
        const done = completed.has(step.key) || i < 3;
        const event = events?.find((e) => e.type === step.key);
        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              {i < STEPS.length - 1 && (
                <div
                  className={cn('w-0.5 flex-1 min-h-[16px]', done ? 'bg-emerald-300' : 'bg-muted')}
                />
              )}
            </div>
            <div className={cn('pb-3', compact && 'pb-2')}>
              <p className={cn('text-sm font-medium', !done && 'text-muted-foreground')}>
                {step.label}
              </p>
              {event && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(event.createdAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
