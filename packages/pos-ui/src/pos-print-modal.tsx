'use client';

import { cn } from '@mdh/ui';
import { ChefHat, Copy, Printer, Receipt, Store, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

export type PosPrintAction = 'receipt' | 'reprint' | 'kot' | 'customer-copy' | 'merchant-copy';

interface PosPrintModalProps {
  open: boolean;
  darkMode: boolean;
  onClose: () => void;
  onAction: (action: PosPrintAction) => void;
  hasLastReceipt: boolean;
  hasBill: boolean;
  loading?: boolean;
}

const ACTIONS: {
  id: PosPrintAction;
  label: string;
  desc: string;
  icon: typeof Printer;
  needsBill?: boolean;
  needsLast?: boolean;
}[] = [
  {
    id: 'receipt',
    label: 'Print Receipt',
    desc: 'Current or settled bill',
    icon: Receipt,
    needsBill: true,
  },
  {
    id: 'reprint',
    label: 'Reprint Last Receipt',
    desc: 'Last completed payment',
    icon: Copy,
    needsLast: true,
  },
  { id: 'kot', label: 'Print KOT', desc: 'Kitchen order ticket', icon: ChefHat, needsBill: true },
  {
    id: 'customer-copy',
    label: 'Customer Copy',
    desc: 'Labelled customer copy',
    icon: Printer,
    needsBill: true,
  },
  {
    id: 'merchant-copy',
    label: 'Merchant Copy',
    desc: 'Labelled merchant copy',
    icon: Store,
    needsBill: true,
  },
];

export function PosPrintModal({
  open,
  darkMode,
  onClose,
  onAction,
  hasLastReceipt,
  hasBill,
  loading,
}: PosPrintModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[290] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border overflow-hidden',
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
              <Printer className="h-5 w-5" /> Print Options
            </h3>
            <p className="text-xs text-gray-400">Thermal 58mm / 80mm · receipt only</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 grid gap-2">
          {ACTIONS.map(({ id, label, desc, icon: Icon, needsBill, needsLast }) => {
            const disabled = loading || (needsBill && !hasBill) || (needsLast && !hasLastReceipt);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onAction(id);
                  onClose();
                }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition',
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:scale-[1.01] active:scale-[0.99]',
                  darkMode
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: POS_THEME.primary }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
