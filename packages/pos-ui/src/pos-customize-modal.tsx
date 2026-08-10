'use client';

import { useState } from 'react';
import { Button, cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { PosMenuProductDto } from '@mdh/types';
import { X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

interface PosCustomizeModalProps {
  product: PosMenuProductDto | null;
  onClose: () => void;
  onConfirm: (product: PosMenuProductDto, extras: CustomizeExtras) => void;
  darkMode: boolean;
}

export interface CustomizeExtras {
  spiceLevel: string;
  extraChutney: boolean;
  extraSambar: boolean;
  butter: boolean;
  cheese: boolean;
  packing: boolean;
  notes: string;
}

const SPICE_LEVELS = ['Mild', 'Medium', 'Hot', 'Extra Hot'];

export function PosCustomizeModal({
  product,
  onClose,
  onConfirm,
  darkMode,
}: PosCustomizeModalProps) {
  const [spiceLevel, setSpiceLevel] = useState('Medium');
  const [extraChutney, setExtraChutney] = useState(false);
  const [extraSambar, setExtraSambar] = useState(false);
  const [butter, setButter] = useState(false);
  const [cheese, setCheese] = useState(false);
  const [packing, setPacking] = useState(false);
  const [notes, setNotes] = useState('');

  if (!product) return null;

  const extrasTotal =
    (extraChutney ? 10 : 0) +
    (extraSambar ? 10 : 0) +
    (butter ? 15 : 0) +
    (cheese ? 25 : 0) +
    (packing ? product.packingCharge : 0);
  const total = product.price + extrasTotal;

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border overflow-hidden',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-lg">{product.name}</h3>
            <p className="text-sm text-gray-400">Customize your order</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Spice Level</p>
            <div className="flex flex-wrap gap-2">
              {SPICE_LEVELS.map((l) => (
                <ToggleChip
                  key={l}
                  label={l}
                  active={spiceLevel === l}
                  onClick={() => setSpiceLevel(l)}
                  dark={darkMode}
                />
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Add-ons</p>
            <div className="space-y-2">
              <AddonRow
                label="Extra Chutney"
                price={10}
                checked={extraChutney}
                onChange={setExtraChutney}
                dark={darkMode}
              />
              <AddonRow
                label="Extra Sambar"
                price={10}
                checked={extraSambar}
                onChange={setExtraSambar}
                dark={darkMode}
              />
              <AddonRow
                label="Butter"
                price={15}
                checked={butter}
                onChange={setButter}
                dark={darkMode}
              />
              <AddonRow
                label="Cheese"
                price={25}
                checked={cheese}
                onChange={setCheese}
                dark={darkMode}
              />
              {product.packingCharge > 0 && (
                <AddonRow
                  label="Packing"
                  price={product.packingCharge}
                  checked={packing}
                  onChange={setPacking}
                  dark={darkMode}
                />
              )}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Special Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions…"
              rows={2}
              className={cn(
                'w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none',
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
              )}
            />
          </section>
        </div>

        <div
          className={cn(
            'p-4 border-t flex items-center justify-between',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-2xl font-bold" style={{ color: POS_THEME.primary }}>
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-xl px-8 font-bold"
            style={{ background: POS_THEME.primary }}
            onClick={() =>
              onConfirm(product, {
                spiceLevel,
                extraChutney,
                extraSambar,
                butter,
                cheese,
                packing,
                notes,
              })
            }
          >
            Add to Bill
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  dark,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold transition',
        active ? 'text-white' : dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600',
      )}
      style={active ? { background: POS_THEME.primary } : undefined}
    >
      {label}
    </button>
  );
}

function AddonRow({
  label,
  price,
  checked,
  onChange,
  dark,
}: {
  label: string;
  price: number;
  checked: boolean;
  onChange: (v: boolean) => void;
  dark: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition',
        checked
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
          : dark
            ? 'border-gray-700 hover:bg-gray-800'
            : 'border-gray-200 hover:bg-gray-50',
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded accent-emerald-600"
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-emerald-600">+{formatCurrency(price)}</span>
    </label>
  );
}
