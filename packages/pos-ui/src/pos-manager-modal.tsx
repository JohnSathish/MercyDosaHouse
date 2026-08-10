'use client';

import { useState } from 'react';
import { Button, Input, cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { PosBillSummaryDto } from '@mdh/types';
import { X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

export type ManagerAction = 'void' | 'refund';

interface PosManagerModalProps {
  open: boolean;
  action: ManagerAction;
  bill: PosBillSummaryDto | null;
  darkMode: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (data: { reason: string; managerPin: string; amount?: number }) => void;
}

export function PosManagerModal({
  open,
  action,
  bill,
  darkMode,
  loading,
  onClose,
  onConfirm,
}: PosManagerModalProps) {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [amount, setAmount] = useState('');

  if (!open || !bill) return null;

  const title = action === 'void' ? 'Void Bill' : 'Refund Bill';

  return (
    <div className="fixed inset-0 z-[310] bg-black/60 flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl border p-5',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-1">Bill #{bill.orderNumber}</p>
        <p className="text-xl font-bold mb-4" style={{ color: POS_THEME.primary }}>
          {formatCurrency(bill.grandTotal)}
        </p>

        {action === 'refund' && (
          <Input
            type="number"
            placeholder="Refund amount ₹"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn('mb-3', darkMode ? 'bg-gray-800 border-gray-700' : '')}
          />
        )}
        <Input
          placeholder="Reason *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={cn('mb-3', darkMode ? 'bg-gray-800 border-gray-700' : '')}
        />
        <Input
          placeholder="Manager PIN *"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={cn('mb-4', darkMode ? 'bg-gray-800 border-gray-700' : '')}
        />

        <Button
          className="w-full rounded-xl font-bold"
          style={{ background: action === 'void' ? '#DC2626' : POS_THEME.primary }}
          disabled={loading || !reason.trim() || !pin.trim()}
          onClick={() =>
            onConfirm({
              reason,
              managerPin: pin,
              amount: action === 'refund' ? parseFloat(amount) || bill.grandTotal : undefined,
            })
          }
        >
          {loading ? 'Processing…' : `Confirm ${title}`}
        </Button>
      </div>
    </div>
  );
}
