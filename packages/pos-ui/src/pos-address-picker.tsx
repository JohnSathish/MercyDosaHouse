'use client';

import { cn } from '@mdh/ui';
import type { AddressDto } from '@mdh/types';

interface PosAddressPickerProps {
  addresses: AddressDto[];
  selected?: string;
  onSelect: (formatted: string, addressId?: string) => void;
  darkMode: boolean;
}

export function PosAddressPicker({
  addresses,
  selected,
  onSelect,
  darkMode,
}: PosAddressPickerProps) {
  if (!addresses.length) {
    return (
      <p className="text-[10px] text-gray-400 px-1">No saved addresses — enter manually above</p>
    );
  }

  return (
    <div className="space-y-1 mt-1.5 max-h-32 overflow-y-auto">
      {addresses.map((a) => {
        const formatted = [a.line1, a.line2, a.landmark, a.city, a.pincode]
          .filter(Boolean)
          .join(', ');
        const key = a.id ?? formatted;
        const active = selected === formatted;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(formatted, a.id)}
            className={cn(
              'w-full text-left p-2 rounded-lg text-[10px] border transition',
              active
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : darkMode
                  ? 'border-gray-700 hover:bg-gray-800'
                  : 'border-gray-200 hover:bg-gray-50',
            )}
          >
            <span className="font-semibold">{a.label ?? 'Address'}</span>
            <p className="text-gray-400 mt-0.5 line-clamp-2">{formatted}</p>
          </button>
        );
      })}
    </div>
  );
}
