'use client';

import { useState } from 'react';
import { cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { PosBillSummaryDto } from '@mdh/types';
import { Copy, Printer, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

interface PosRecentBillsPanelProps {
  open: boolean;
  bills?: PosBillSummaryDto[];
  darkMode: boolean;
  loading?: boolean;
  onClose: () => void;
  onSearch: (q: string) => void;
  onReorder: (billId: string) => void;
  onVoid: (bill: PosBillSummaryDto) => void;
  onRefund: (bill: PosBillSummaryDto) => void;
  onPrint: (billId: string) => void;
}

export function PosRecentBillsPanel({
  open,
  bills,
  darkMode,
  loading,
  onClose,
  onSearch,
  onReorder,
  onVoid,
  onRefund,
  onPrint,
}: PosRecentBillsPanelProps) {
  const [query, setQuery] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[290] bg-black/50 backdrop-blur-sm flex items-center justify-end p-0">
      <div
        className={cn(
          'h-full w-full max-w-md border-l flex flex-col',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div
          className={cn(
            'p-4 border-b flex items-center justify-between',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <div>
            <h3 className="font-bold text-lg">Recent Bills</h3>
            <p className="text-xs text-gray-400">Last 20 settled bills today</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search bill #, customer…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className={cn(
                'w-full h-9 pl-9 pr-3 rounded-xl text-sm border outline-none',
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
              )}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && <p className="text-center text-sm text-gray-400 py-8">Loading…</p>}
          {!loading && (!bills || bills.length === 0) && (
            <p className="text-center text-sm text-gray-400 py-8">No bills found</p>
          )}
          {bills?.map((b) => (
            <div
              key={b.id}
              className={cn(
                'p-3 rounded-xl border',
                darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50',
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm font-mono">#{b.orderNumber}</p>
                  <p className="text-xs text-gray-400">{b.customerName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {b.tableLabel ? `Table ${b.tableLabel} · ` : ''}
                    {b.itemCount} items ·{' '}
                    {new Date(b.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: POS_THEME.primary }}>
                    {formatCurrency(b.grandTotal)}
                  </p>
                  <span className="text-[9px] uppercase text-gray-400">{b.billStatus}</span>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                <MiniBtn
                  icon={<Copy className="h-3 w-3" />}
                  label="Reorder"
                  onClick={() => onReorder(b.id)}
                  dark={darkMode}
                />
                <MiniBtn
                  icon={<Printer className="h-3 w-3" />}
                  label="Print"
                  onClick={() => onPrint(b.id)}
                  dark={darkMode}
                />
                {b.billStatus === 'SETTLED' && (
                  <>
                    <MiniBtn
                      icon={<RotateCcw className="h-3 w-3" />}
                      label="Void"
                      onClick={() => onVoid(b)}
                      dark={darkMode}
                    />
                    <MiniBtn
                      icon={<RefreshCw className="h-3 w-3" />}
                      label="Refund"
                      onClick={() => onRefund(b)}
                      dark={darkMode}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniBtn({
  icon,
  label,
  onClick,
  dark,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-semibold border transition',
        dark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-white',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
