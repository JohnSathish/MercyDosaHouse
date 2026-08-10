'use client';

import { Button, cn } from '@mdh/ui';
import { AlertTriangle, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';
import type { PosOrderType } from '@mdh/types';

const MODE_LABELS: Record<PosOrderType, string> = {
  DINE_IN: 'Dine-In',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  ONLINE_PICKUP: 'Online Pickup',
  STAFF_MEAL: 'Staff Meal',
};

interface PosModeSwitchModalProps {
  open: boolean;
  fromMode: PosOrderType;
  toMode: PosOrderType;
  itemCount: number;
  darkMode: boolean;
  onMove: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PosModeSwitchModal({
  open,
  fromMode,
  toMode,
  itemCount,
  darkMode,
  onMove,
  onSaveDraft,
  onCancel,
  loading,
}: PosModeSwitchModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[275] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border overflow-hidden',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div
          className={cn(
            'flex items-start gap-3 p-4 border-b',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Switch order mode?</h3>
            <p className="text-sm text-gray-400 mt-1">
              Current bill has {itemCount} item{itemCount !== 1 ? 's' : ''} ({MODE_LABELS[fromMode]}
              ).
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <Button
            className="w-full justify-start font-semibold"
            style={{ background: POS_THEME.primary }}
            disabled={loading}
            onClick={onMove}
          >
            Move bill to {MODE_LABELS[toMode]}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={loading}
            onClick={onSaveDraft}
          >
            Save as Draft (Hold)
          </Button>
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
