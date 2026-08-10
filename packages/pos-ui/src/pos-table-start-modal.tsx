'use client';

import { useEffect, useState } from 'react';
import { Button, cn, Input, Label } from '@mdh/ui';
import type { PosCustomerSnapshotDto } from '@mdh/types';
import { Minus, Plus, User, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

export interface TableStartDetails {
  tableId: string;
  tableLabel: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  guests: number;
}

interface PosTableStartModalProps {
  open: boolean;
  tableLabel: string;
  tableId: string;
  cashierName?: string;
  darkMode: boolean;
  customers?: PosCustomerSnapshotDto[];
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialGuests?: number;
  onCustomerSearch: (query: string) => void;
  onClose: () => void;
  onStart: (details: TableStartDetails) => void;
  loading?: boolean;
}

const WALK_IN_NAME = 'Walk-in Customer';
const WALK_IN_PHONE = '0000000000';

export function PosTableStartModal({
  open,
  tableLabel,
  tableId,
  cashierName,
  darkMode,
  customers,
  initialCustomerName = WALK_IN_NAME,
  initialCustomerPhone = WALK_IN_PHONE,
  initialGuests = 2,
  onCustomerSearch,
  onClose,
  onStart,
  loading,
}: PosTableStartModalProps) {
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [guests, setGuests] = useState(initialGuests);
  const [phoneQuery, setPhoneQuery] = useState('');

  useEffect(() => {
    if (open) {
      setCustomerName(initialCustomerName);
      setCustomerPhone(initialCustomerPhone);
      setGuests(initialGuests ?? 2);
      setPhoneQuery(initialCustomerPhone === WALK_IN_PHONE ? '' : initialCustomerPhone);
      setCustomerId(undefined);
    }
  }, [open, initialCustomerName, initialCustomerPhone, initialGuests]);

  if (!open) return null;

  const matchedCustomer =
    customers?.length === 1 && phoneQuery.replace(/\D/g, '').length >= 6 ? customers[0] : null;

  return (
    <div className="fixed inset-0 z-[280] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
            <p className="text-xs text-gray-400 uppercase tracking-wider">Start Dine-In Order</p>
            <h3 className="font-bold text-xl flex items-center gap-2">🪑 Table {tableLabel}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs">Customer Name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={WALK_IN_NAME}
              className={cn('mt-1', darkMode ? 'bg-gray-800 border-gray-700' : '')}
            />
            <button
              type="button"
              onClick={() => {
                setCustomerName(WALK_IN_NAME);
                setCustomerPhone(WALK_IN_PHONE);
                setCustomerId(undefined);
                setPhoneQuery('');
              }}
              className="text-[10px] text-emerald-600 font-semibold mt-1 hover:underline"
            >
              Use Walk-in Customer
            </button>
          </div>

          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              value={phoneQuery}
              onChange={(e) => {
                const v = e.target.value;
                setPhoneQuery(v);
                onCustomerSearch(v);
                if (!v.trim()) {
                  setCustomerPhone(WALK_IN_PHONE);
                  setCustomerId(undefined);
                }
              }}
              placeholder="Optional — search existing customer"
              className={cn('mt-1', darkMode ? 'bg-gray-800 border-gray-700' : '')}
            />
          </div>

          {matchedCustomer && (
            <div
              className={cn(
                'rounded-xl border p-3 text-sm',
                darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-emerald-50 border-emerald-200',
              )}
            >
              <p className="font-bold flex items-center gap-1">
                <User className="h-4 w-4" /> {matchedCustomer.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">{matchedCustomer.phone}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-emerald-600 font-semibold">
                  {matchedCustomer.loyaltyPoints} Reward Pts
                </span>
                <span className="text-gray-400">{matchedCustomer.orderCount} Previous Orders</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomerName(matchedCustomer.name);
                  setCustomerPhone(matchedCustomer.phone);
                  setCustomerId(matchedCustomer.id);
                  setPhoneQuery(matchedCustomer.phone);
                }}
                className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
              >
                Use this customer →
              </button>
            </div>
          )}

          <div>
            <Label className="text-xs">Guests</Label>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                className={cn(
                  'p-2 rounded-xl border',
                  darkMode
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-2xl font-bold w-10 text-center">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests((g) => Math.min(99, g + 1))}
                className={cn(
                  'p-2 rounded-xl border',
                  darkMode
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={cn('rounded-xl px-3 py-2 text-sm', darkMode ? 'bg-gray-800' : 'bg-gray-50')}
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Captain / Waiter</p>
            <p className="font-semibold">{cashierName ?? 'Staff'}</p>
          </div>
        </div>

        <div
          className={cn(
            'p-4 border-t flex gap-2',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-bold"
            style={{ background: POS_THEME.primary }}
            disabled={loading}
            onClick={() =>
              onStart({
                tableId,
                tableLabel,
                customerName: customerName.trim() || WALK_IN_NAME,
                customerPhone: customerPhone.trim() || WALK_IN_PHONE,
                customerId,
                guests,
              })
            }
          >
            {loading ? 'Starting…' : 'Start Order'}
          </Button>
        </div>
      </div>
    </div>
  );
}
