'use client';

import { cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { PosBillDto } from '@mdh/types';
import {
  ChefHat,
  CreditCard,
  Merge,
  Pause,
  Percent,
  Printer,
  Save,
  ShoppingCart,
} from 'lucide-react';
import { POS_THEME } from './pos-theme';

interface PosBottomBarProps {
  bill: PosBillDto | null;
  darkMode: boolean;
  onSaveDraft: () => void;
  onHold: () => void;
  onPrint: () => void;
  onKot: () => void;
  onCoupon: () => void;
  onCheckout: () => void;
  onMerge?: () => void;
}

export function PosBottomBar({
  bill,
  darkMode,
  onSaveDraft,
  onHold,
  onPrint,
  onKot,
  onCoupon,
  onCheckout,
  onMerge,
}: PosBottomBarProps) {
  const actions = [
    { icon: Save, label: 'Save Draft', onClick: onSaveDraft, shortcut: '' },
    { icon: Pause, label: 'Hold Bill', onClick: onHold, shortcut: 'F2' },
    { icon: Merge, label: 'Merge Bills', onClick: onMerge ?? (() => {}), shortcut: '' },
    { icon: Printer, label: 'Print', onClick: onPrint, shortcut: 'F6' },
    { icon: ChefHat, label: 'Send KOT', onClick: onKot, shortcut: 'F7' },
    { icon: Percent, label: 'Coupon', onClick: onCoupon, shortcut: 'F4' },
  ];

  return (
    <footer
      className={cn(
        'shrink-0 border-t px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide',
        darkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white border-gray-200',
      )}
      style={{ boxShadow: '0 -4px 24px rgba(20,83,45,0.06)' }}
    >
      {actions.map(({ icon: Icon, label, onClick, shortcut }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={!bill && label !== 'Save Draft'}
          className={cn(
            'shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition',
            'hover:scale-[1.03] active:scale-[0.97] disabled:opacity-30',
            darkMode
              ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
              : 'text-gray-600 hover:bg-gray-50',
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="text-[10px] font-semibold whitespace-nowrap">{label}</span>
          {shortcut && <span className="text-[8px] text-gray-400 font-mono">{shortcut}</span>}
        </button>
      ))}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onCheckout}
        disabled={!bill?.items.length}
        className={cn(
          'shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white transition',
          'hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40',
        )}
        style={{
          background: `linear-gradient(135deg, ${POS_THEME.accent} 0%, ${POS_THEME.accentDark} 100%)`,
          boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
        }}
      >
        <ShoppingCart className="h-5 w-5" />
        <span>{bill ? `PAY ${formatCurrency(bill.grandTotal)}` : 'CHECKOUT'}</span>
        <span className="text-[10px] opacity-70 font-mono ml-1">F5</span>
      </button>
    </footer>
  );
}
