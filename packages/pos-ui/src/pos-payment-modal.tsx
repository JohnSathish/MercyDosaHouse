'use client';

import { useState } from 'react';
import { Button, Input, cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { PaymentMethod, PosBillDto } from '@mdh/types';
import { Banknote, CreditCard, Smartphone, Wallet, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

const METHODS: {
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { value: 'CASH' as PaymentMethod, label: 'Cash', icon: Banknote, color: 'bg-emerald-500' },
  { value: 'UPI' as PaymentMethod, label: 'UPI', icon: Smartphone, color: 'bg-violet-500' },
  { value: 'CARD' as PaymentMethod, label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
  { value: 'WALLET' as PaymentMethod, label: 'Wallet', icon: Wallet, color: 'bg-amber-500' },
];

export function PosPaymentModal({
  bill,
  open,
  onClose,
  onSettle,
  allowSplit = false,
}: {
  bill: PosBillDto;
  open: boolean;
  onClose: () => void;
  onSettle: (data: {
    paymentMethod: PaymentMethod;
    paymentLines?: { method: PaymentMethod; amount: number; reference?: string }[];
  }) => Promise<void>;
  allowSplit?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CASH' as PaymentMethod);
  const [splitMode, setSplitMode] = useState(false);
  const [lines, setLines] = useState<{ method: PaymentMethod; amount: number }[]>([
    { method: 'CASH' as PaymentMethod, amount: bill.grandTotal },
  ]);
  const [loading, setLoading] = useState(false);
  const [received, setReceived] = useState(String(bill.grandTotal));

  if (!open) return null;

  async function handlePay() {
    setLoading(true);
    try {
      if (splitMode && allowSplit) {
        await onSettle({ paymentMethod: 'SPLIT' as PaymentMethod, paymentLines: lines });
      } else {
        await onSettle({ paymentMethod: method });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const change = Math.max(0, parseFloat(received || '0') - bill.grandTotal);

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 text-gray-900"
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold">Payment</h3>
            <p className="text-xs text-gray-400">Bill #{bill.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-4xl font-bold mb-6" style={{ color: POS_THEME.primary }}>
          {formatCurrency(bill.grandTotal)}
        </p>

        {allowSplit && (
          <button
            type="button"
            className="text-xs font-semibold mb-4 underline"
            style={{ color: POS_THEME.primary }}
            onClick={() => setSplitMode(!splitMode)}
          >
            {splitMode ? 'Single payment' : 'Split payment'}
          </button>
        )}

        {!splitMode ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {METHODS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    method === value
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className={cn('p-3 rounded-xl text-white', color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-sm">{label}</span>
                </button>
              ))}
            </div>

            {method === ('CASH' as PaymentMethod) && (
              <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase">
                  Cash Received
                </label>
                <Input
                  type="number"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  className="h-12 text-lg font-bold"
                />
                {change > 0 && (
                  <p className="text-sm">
                    Change:{' '}
                    <span className="font-bold text-emerald-600">{formatCurrency(change)}</span>
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 mb-4">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={line.method}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...line, method: e.target.value as PaymentMethod };
                    setLines(next);
                  }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 px-2 text-sm"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  value={line.amount}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...line, amount: parseFloat(e.target.value) || 0 };
                    setLines(next);
                  }}
                  className="w-28 h-10"
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-semibold"
              style={{ color: POS_THEME.primary }}
              onClick={() => setLines([...lines, { method: 'UPI' as PaymentMethod, amount: 0 }])}
            >
              + Add line
            </button>
          </div>
        )}

        <Button
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-bold"
          style={{ background: POS_THEME.primary }}
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? 'Processing…' : `Confirm Payment · ${formatCurrency(bill.grandTotal)}`}
        </Button>
      </div>
    </div>
  );
}
