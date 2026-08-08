'use client';

import { cn } from '@mdh/ui';
import type { ReportPeriod } from '@mdh/types';

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
];

interface ReportsFilterBarProps {
  period: ReportPeriod;
  onPeriodChange: (p: ReportPeriod) => void;
  paymentMethod?: string;
  onPaymentChange?: (v: string) => void;
}

export function ReportsFilterBar({
  period,
  onPeriodChange,
  paymentMethod = '',
  onPaymentChange,
}: ReportsFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between rounded-2xl border bg-white/80 dark:bg-gray-900/80 backdrop-blur p-4 shadow-sm">
      <div className="flex flex-wrap gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              period === p.id
                ? 'bg-[#14532D] text-white'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentChange?.(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-gray-900"
        >
          <option value="">All Payments</option>
          <option value="COD">Cash</option>
          <option value="UPI">UPI</option>
          <option value="RAZORPAY">Card/Online</option>
        </select>
      </div>
    </div>
  );
}
