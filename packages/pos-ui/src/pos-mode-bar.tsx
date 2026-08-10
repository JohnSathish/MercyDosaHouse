'use client';

import { cn } from '@mdh/ui';
import type { PosOrderType } from '@mdh/types';

const MODES: { value: PosOrderType; label: string; emoji: string }[] = [
  { value: 'DINE_IN', label: 'Dine In', emoji: '🍽' },
  { value: 'TAKEAWAY', label: 'Takeaway', emoji: '🥡' },
  { value: 'DELIVERY', label: 'Delivery', emoji: '🛵' },
  { value: 'ONLINE_PICKUP', label: 'Online Pickup', emoji: '📦' },
  { value: 'STAFF_MEAL', label: 'Staff Meal', emoji: '👨‍💼' },
];

interface PosModeBarProps {
  orderType: PosOrderType;
  onChange: (mode: PosOrderType) => void;
  darkMode: boolean;
}

export function PosModeBar({ orderType, onChange, darkMode }: PosModeBarProps) {
  return (
    <div
      className={cn(
        'shrink-0 px-4 py-2 border-b flex gap-2 overflow-x-auto scrollbar-hide',
        darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-100',
      )}
    >
      {MODES.map((m) => {
        const active = orderType === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={cn(
              'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
              active
                ? 'text-white shadow-lg'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
            style={
              active
                ? {
                    background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
                    boxShadow: '0 4px 14px rgba(20,83,45,0.35)',
                  }
                : undefined
            }
          >
            <span className="text-base">{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
