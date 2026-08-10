'use client';

import { formatCurrency } from '@mdh/utils';
import type { PosHoldBillDto } from '@mdh/types';
import { cn } from '@mdh/ui';
import { Clock, Pause, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

interface PosHoldPanelProps {
  open: boolean;
  holds?: PosHoldBillDto[];
  darkMode: boolean;
  onClose: () => void;
  onResume: (orderId: string) => void;
  loading?: boolean;
}

export function PosHoldPanel({
  open,
  holds,
  darkMode,
  onClose,
  onResume,
  loading,
}: PosHoldPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[280] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl border overflow-hidden',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Pause className="h-5 w-5" /> Held Bills
            </h3>
            <p className="text-xs text-gray-400">F3 to recall · Click to resume</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {loading && <p className="text-center text-sm text-gray-400 py-8">Loading held bills…</p>}
          {!loading && (!holds || holds.length === 0) && (
            <div className="text-center py-8 px-4 space-y-2">
              <p className="text-sm text-gray-400">No held bills</p>
              <p className="text-xs text-gray-500">
                Use <strong>Hold</strong> (F2) or <strong>Save Draft</strong> on an active bill to
                recall it here.
              </p>
            </div>
          )}
          {holds?.map((h) => (
            <button
              key={h.id}
              type="button"
              disabled={!h.orderId}
              onClick={() => h.orderId && onResume(h.orderId)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition hover:scale-[1.01]',
                darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">
                  {h.label ?? `Bill · ${h.itemCount} items`}
                </span>
                <span className="font-bold" style={{ color: POS_THEME.primary }}>
                  {formatCurrency(h.grandTotal)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                {h.itemCount > 0 && <span>{h.itemCount} items</span>}
                {h.tableLabel && <span>Table {h.tableLabel}</span>}
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(h.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
