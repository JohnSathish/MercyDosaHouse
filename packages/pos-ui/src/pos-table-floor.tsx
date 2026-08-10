'use client';

import { useState } from 'react';
import { cn } from '@mdh/ui';
import type { PosTableDto } from '@mdh/types';
import { ArrowRightLeft, Merge, Users, X } from 'lucide-react';
import { TABLE_STATUS_COLORS } from './pos-store';
import { POS_THEME } from './pos-theme';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  CLEANING: 'Cleaning',
  BILLING: 'Billing',
  WAITING: 'Waiting',
};

const STATUS_BORDER: Record<string, string> = {
  AVAILABLE: 'border-emerald-400',
  OCCUPIED: 'border-amber-400',
  RESERVED: 'border-violet-400',
  CLEANING: 'border-red-400',
  BILLING: 'border-blue-400',
  WAITING: 'border-orange-400',
};

interface PosTableFloorProps {
  tables: PosTableDto[];
  selectedId: string | null;
  mode: 'select' | 'merge' | 'transfer';
  mergeSelection: string[];
  transferFrom: string | null;
  onSelect: (id: string) => void;
  onModeChange: (mode: 'select' | 'merge' | 'transfer') => void;
  onMergeConfirm: () => void;
  onClose: () => void;
  darkMode: boolean;
}

export function PosTableFloor({
  tables,
  selectedId,
  mode,
  mergeSelection,
  transferFrom,
  onSelect,
  onModeChange,
  onMergeConfirm,
  onClose,
  darkMode,
}: PosTableFloorProps) {
  return (
    <div
      className={cn(
        'shrink-0 mx-4 mb-2 rounded-2xl border p-4 backdrop-blur-sm',
        darkMode ? 'bg-gray-900/90 border-gray-700' : 'bg-white/90 border-gray-200',
      )}
      style={{ boxShadow: POS_THEME.shadow }}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <h3 className={cn('font-bold text-sm', darkMode ? 'text-white' : 'text-gray-900')}>
            Table Management
          </h3>
          <p className="text-[10px] text-gray-400">
            {mode === 'select' && 'Select a table for Dine-In'}
            {mode === 'merge' && 'Select tables to merge (first = target)'}
            {mode === 'transfer' &&
              (transferFrom ? 'Select destination table' : 'Select source table')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ModeBtn
            active={mode === 'select'}
            onClick={() => onModeChange('select')}
            label="Select"
            dark={darkMode}
          />
          <ModeBtn
            active={mode === 'merge'}
            onClick={() => onModeChange('merge')}
            icon={<Merge className="h-3 w-3" />}
            label="Merge"
            dark={darkMode}
          />
          <ModeBtn
            active={mode === 'transfer'}
            onClick={() => onModeChange('transfer')}
            icon={<ArrowRightLeft className="h-3 w-3" />}
            label="Transfer"
            dark={darkMode}
          />
          <button
            type="button"
            onClick={onClose}
            className={cn('p-1.5 rounded-lg', darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mode === 'merge' && mergeSelection.length >= 2 && (
        <button
          type="button"
          onClick={onMergeConfirm}
          className="mb-3 w-full py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: POS_THEME.primary }}
        >
          Merge {mergeSelection.length} tables →{' '}
          {tables.find((t) => t.id === mergeSelection[0])?.label}
        </button>
      )}

      <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
        {(['AVAILABLE', 'OCCUPIED', 'BILLING', 'RESERVED', 'WAITING', 'CLEANING'] as const).map(
          (s) => (
            <span key={s} className="flex items-center gap-1 text-gray-500">
              <span className={cn('w-2.5 h-2.5 rounded-full', TABLE_STATUS_COLORS[s])} />
              {STATUS_LABELS[s]}
            </span>
          ),
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
        {tables.map((t) => {
          const selected =
            mode === 'merge'
              ? mergeSelection.includes(t.id)
              : mode === 'transfer'
                ? transferFrom === t.id || selectedId === t.id
                : selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl p-2 min-h-[72px] transition-all',
                'hover:scale-105 active:scale-95 border-2',
                selected ? 'ring-2 ring-emerald-500 ring-offset-2' : 'border-transparent',
                STATUS_BORDER[t.status] ?? 'border-gray-300',
                TABLE_STATUS_COLORS[t.status],
                'text-white shadow-md',
              )}
            >
              <span className="font-bold text-sm">{t.label}</span>
              <span className="text-[8px] opacity-80 mt-0.5">
                {STATUS_LABELS[t.status]?.slice(0, 4)}
              </span>
              {t.capacity > 0 && (
                <span className="flex items-center gap-0.5 text-[8px] opacity-80 mt-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {t.capacity}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  label,
  icon,
  dark,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border',
        active
          ? 'bg-emerald-600 text-white border-emerald-600'
          : dark
            ? 'border-gray-600 text-gray-400'
            : 'border-gray-200 text-gray-500',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
