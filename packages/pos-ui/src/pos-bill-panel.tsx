'use client';

import { Button, Input, cn } from '@mdh/ui';
import { formatCurrency, formatPackingLabel } from '@mdh/utils';
import type { PosBillDto, PosCustomerSnapshotDto, PosTableDto } from '@mdh/types';
import {
  Clock,
  CreditCard,
  Minus,
  Pause,
  Plus,
  RotateCcw,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { POS_THEME } from './pos-theme';
import { PosOrderTimeline } from './pos-receipt';
import { PosAddressPicker } from './pos-address-picker';
import type { AddressDto } from '@mdh/types';

interface PosBillPanelProps {
  bill: PosBillDto | null;
  tables: PosTableDto[];
  selectedTableId: string | null;
  customerQuery: string;
  customers?: PosCustomerSnapshotDto[];
  darkMode: boolean;
  isManager?: boolean;
  discountAmount: string;
  managerPin: string;
  orderType: string;
  onCustomerQueryChange: (v: string) => void;
  onSelectCustomer: (c: PosCustomerSnapshotDto) => void;
  onSetWalkIn?: () => void;
  onNewBill: () => void;
  onHold: () => void;
  onClear: () => void;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onItemNotes?: (itemId: string, notes: string) => void;
  onPay: () => void;
  deliveryAddress?: string;
  onDeliveryAddressChange?: (v: string) => void;
  customerAddresses?: AddressDto[];
  onRecall?: () => void;
  onRecentBills?: () => void;
  onDiscountChange: (v: string) => void;
  onManagerPinChange: (v: string) => void;
  onApplyDiscount: () => void;
  createPending?: boolean;
  holdPending?: boolean;
  guestCount?: number;
  onGuestCountChange?: (count: number) => void;
  cashierName?: string;
  liveTime?: Date | null;
  pendingCustomerName?: string;
  pendingCustomerPhone?: string;
  staffName?: string;
  onStaffNameChange?: (v: string) => void;
  pickupTime?: string;
  onPickupTimeChange?: (v: string) => void;
}

export function PosBillPanel({
  bill,
  tables,
  selectedTableId,
  customerQuery,
  customers,
  darkMode,
  isManager,
  discountAmount,
  managerPin,
  onCustomerQueryChange,
  onSelectCustomer,
  onSetWalkIn,
  onNewBill,
  onHold,
  onClear,
  onRecall,
  onUpdateQty,
  onRemoveItem,
  onItemNotes,
  onPay,
  deliveryAddress,
  onDeliveryAddressChange,
  customerAddresses,
  onRecentBills,
  onDiscountChange,
  onManagerPinChange,
  onApplyDiscount,
  createPending,
  holdPending,
  orderType,
  guestCount = 2,
  onGuestCountChange,
  cashierName,
  liveTime,
  pendingCustomerName,
  pendingCustomerPhone,
  staffName,
  onStaffNameChange,
  pickupTime,
  onPickupTimeChange,
}: PosBillPanelProps) {
  const tableLabel = selectedTableId
    ? tables.find((t) => t.id === selectedTableId)?.label
    : bill?.tableLabel;

  const customerName = bill?.customerName ?? pendingCustomerName ?? 'Walk-in Customer';
  const customerPhone = bill?.customerPhone ?? pendingCustomerPhone ?? '0000000000';
  const guests = bill?.covers ?? guestCount;
  const isDineIn = orderType === 'DINE_IN';
  const isTakeaway = orderType === 'TAKEAWAY';
  const isDelivery = orderType === 'DELIVERY';
  const isPickup = orderType === 'ONLINE_PICKUP';
  const isStaffMeal = orderType === 'STAFF_MEAL';

  const elapsedMins =
    bill && liveTime
      ? Math.max(0, Math.floor((liveTime.getTime() - new Date(bill.createdAt).getTime()) / 60000))
      : null;

  const matchedProfile =
    customers?.length === 1 &&
    customerQuery.replace(/\D/g, '').length >= 6 &&
    customers[0].phone.replace(/\D/g, '') === customerQuery.replace(/\D/g, '')
      ? customers[0]
      : customers?.length === 1 && customerQuery.trim().length >= 2
        ? customers[0]
        : null;

  const displayPhone = customerPhone && customerPhone !== '0000000000' ? customerPhone : '-';

  return (
    <aside
      id="pos-bill-panel"
      tabIndex={-1}
      className={cn(
        'shrink-0 w-80 xl:w-[22rem] 2xl:w-96 flex flex-col border-l overflow-hidden',
        darkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white border-gray-200',
      )}
      style={{ boxShadow: '-4px 0 24px rgba(20,83,45,0.06)' }}
    >
      {/* Header */}
      <div className={cn('p-3 border-b', darkMode ? 'border-gray-800' : 'border-gray-100')}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className={cn('font-bold text-base', darkMode ? 'text-white' : 'text-gray-900')}>
              Current Bill
            </h2>
            {bill && <p className="text-[10px] text-gray-400 font-mono">#{bill.orderNumber}</p>}
          </div>
          {bill && (
            <span className="text-sm font-bold" style={{ color: POS_THEME.primary }}>
              {formatCurrency(bill.grandTotal)}
            </span>
          )}
        </div>

        {/* Bill context — Table & Customer always separate */}
        {(isDineIn ||
          bill ||
          selectedTableId ||
          isTakeaway ||
          isDelivery ||
          isPickup ||
          isStaffMeal) && (
          <div
            className={cn(
              'rounded-xl p-2.5 mb-2 space-y-1.5 text-xs',
              darkMode
                ? 'bg-gray-800/80 border border-gray-700'
                : 'bg-emerald-50/80 border border-emerald-100',
            )}
          >
            {isDineIn && tableLabel && (
              <p className={cn('font-bold text-sm', darkMode ? 'text-white' : 'text-gray-900')}>
                🪑 Table {tableLabel}
              </p>
            )}
            {isTakeaway && (
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                🚶 Takeaway
              </p>
            )}
            {isDelivery && (
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                🛵 Delivery
              </p>
            )}
            {isPickup && (
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                📦 Online Pickup
              </p>
            )}
            {isStaffMeal && (
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                👨‍🍳 Staff Meal
              </p>
            )}
            <p className={cn('font-semibold', darkMode ? 'text-gray-200' : 'text-gray-800')}>
              👤 {customerName}
            </p>
            {isDineIn && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 flex items-center gap-1">
                  <Users className="h-3 w-3" /> {guests} Guest{guests !== 1 ? 's' : ''}
                </span>
                {onGuestCountChange && (
                  <div className="flex items-center gap-1">
                    <QtyBtn onClick={() => onGuestCountChange(guests - 1)} dark={darkMode}>
                      <Minus className="h-2.5 w-2.5" />
                    </QtyBtn>
                    <QtyBtn onClick={() => onGuestCountChange(guests + 1)} dark={darkMode}>
                      <Plus className="h-2.5 w-2.5" />
                    </QtyBtn>
                  </div>
                )}
              </div>
            )}
            {!isDineIn && displayPhone !== '-' && (
              <p className="text-gray-500">📞 {displayPhone}</p>
            )}
            {isDelivery && bill?.orderNumber && (
              <p className="text-gray-500 font-mono text-[10px]">Order #{bill.orderNumber}</p>
            )}
            {isStaffMeal && staffName && <p className="text-gray-500">Staff: {staffName}</p>}
            {isPickup && pickupTime && <p className="text-gray-500">Pickup: {pickupTime}</p>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400 pt-0.5 border-t border-dashed border-gray-300/50">
              {cashierName && <span>Captain: {cashierName}</span>}
              {elapsedMins != null && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" /> {elapsedMins} min
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <ActionChip label="New Bill" onClick={onNewBill} loading={createPending} primary />
          <ActionChip
            label="Hold"
            onClick={onHold}
            loading={holdPending}
            disabled={!bill?.items.length}
          />
          <ActionChip label="Recall" onClick={onRecall ?? (() => {})} />
          <ActionChip
            label="Clear"
            onClick={onClear}
            disabled={!bill}
            icon={<RotateCcw className="h-3 w-3" />}
          />
        </div>
      </div>

      {isDelivery && onDeliveryAddressChange && (
        <div className={cn('px-3 py-2 border-b', darkMode ? 'border-gray-800' : 'border-gray-100')}>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Delivery Address <span className="text-amber-600">(required at checkout)</span>
          </p>
          <input
            type="text"
            placeholder="Enter before payment…"
            value={deliveryAddress ?? ''}
            onChange={(e) => onDeliveryAddressChange(e.target.value)}
            className={cn(
              'w-full h-9 px-3 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30',
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500'
                : 'bg-gray-50 border-gray-200',
            )}
          />
          {customerAddresses && (
            <PosAddressPicker
              addresses={customerAddresses}
              selected={deliveryAddress}
              onSelect={(formatted) => onDeliveryAddressChange(formatted)}
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {isStaffMeal && onStaffNameChange && (
        <div className={cn('px-3 py-2 border-b', darkMode ? 'border-gray-800' : 'border-gray-100')}>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Staff Name <span className="text-amber-600">(required at checkout)</span>
          </p>
          <input
            type="text"
            placeholder="Employee name…"
            value={staffName ?? ''}
            onChange={(e) => onStaffNameChange(e.target.value)}
            className={cn(
              'w-full h-9 px-3 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30',
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500'
                : 'bg-gray-50 border-gray-200',
            )}
          />
        </div>
      )}

      {isPickup && onPickupTimeChange && (
        <div className={cn('px-3 py-2 border-b', darkMode ? 'border-gray-800' : 'border-gray-100')}>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Pickup Time <span className="text-amber-600">(required at checkout)</span>
          </p>
          <input
            type="time"
            value={pickupTime ?? ''}
            onChange={(e) => onPickupTimeChange(e.target.value)}
            className={cn(
              'w-full h-9 px-3 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30',
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200',
            )}
          />
        </div>
      )}

      {onRecentBills && (
        <div className="px-3 py-1">
          <button
            type="button"
            onClick={onRecentBills}
            className="text-[10px] font-semibold text-emerald-600 hover:underline"
          >
            View recent bills →
          </button>
        </div>
      )}

      {/* Customer lookup — separate from table */}
      <div className={cn('px-3 py-2 border-b', darkMode ? 'border-gray-800' : 'border-gray-100')}>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1.5">Customer Lookup</p>
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            placeholder="Search phone number…"
            value={customerQuery}
            onChange={(e) => onCustomerQueryChange(e.target.value)}
            className={cn(
              'w-full h-9 pl-8 pr-3 rounded-xl text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30',
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500'
                : 'bg-gray-50 border-gray-200',
            )}
          />
        </div>

        {matchedProfile && (
          <div
            className={cn(
              'mt-2 rounded-xl border p-2.5 text-xs',
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-200',
            )}
          >
            <p className="font-bold">{matchedProfile.name}</p>
            <p className="text-gray-400">{matchedProfile.phone}</p>
            <div className="flex gap-3 mt-1.5">
              <span className="text-emerald-600 font-semibold">
                {matchedProfile.loyaltyPoints} pts
              </span>
              <span className="text-gray-400">{matchedProfile.orderCount} orders</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectCustomer(matchedProfile)}
              className="mt-1.5 text-[10px] font-bold text-emerald-700 hover:underline"
            >
              Link to bill →
            </button>
          </div>
        )}

        {customers && customers.length > 1 && (
          <div className="mt-1.5 space-y-1 max-h-24 overflow-y-auto">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCustomer(c)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded-lg text-xs transition',
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
                )}
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-gray-400 ml-1">{c.phone}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onSetWalkIn}
          className="text-[10px] text-emerald-600 font-semibold mt-1.5 hover:underline"
        >
          Reset to Walk-in Customer
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {bill?.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex gap-2 items-start p-2 rounded-xl border text-sm',
              darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100',
            )}
          >
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-semibold truncate text-xs',
                  darkMode ? 'text-white' : 'text-gray-900',
                )}
              >
                {item.productName}
              </p>
              <p className="text-[10px] text-gray-400">{formatCurrency(item.unitPrice)} each</p>
              {item.specialInstructions && (
                <p className="text-[9px] text-amber-600 mt-0.5 line-clamp-2">
                  {item.specialInstructions}
                </p>
              )}
              {onItemNotes && (
                <input
                  type="text"
                  placeholder="Notes…"
                  defaultValue={item.specialInstructions ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (item.specialInstructions ?? '')) {
                      onItemNotes(item.id, e.target.value);
                    }
                  }}
                  className={cn(
                    'mt-1 w-full h-6 px-1.5 rounded text-[9px] border outline-none',
                    darkMode ? 'bg-gray-900 border-gray-600' : 'bg-white border-gray-200',
                  )}
                />
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <QtyBtn onClick={() => onUpdateQty(item.id, item.quantity - 1)} dark={darkMode}>
                <Minus className="h-3 w-3" />
              </QtyBtn>
              <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
              <QtyBtn onClick={() => onUpdateQty(item.id, item.quantity + 1)} dark={darkMode}>
                <Plus className="h-3 w-3" />
              </QtyBtn>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="p-1 rounded-lg text-red-500 hover:bg-red-50 ml-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <span
              className="text-xs font-bold w-14 text-right shrink-0"
              style={{ color: POS_THEME.primary }}
            >
              {formatCurrency(item.totalPrice)}
            </span>
          </div>
        ))}

        {bill && !bill.items.length && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-2">🧾</span>
            <p className="text-sm text-gray-400">Tap items to add to bill</p>
          </div>
        )}

        {!bill && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-400">Start a new bill to begin</p>
          </div>
        )}

        {bill && bill.billStatus === 'SETTLED' && (
          <div className="mt-2">
            <PosOrderTimeline status={bill.status} />
          </div>
        )}
      </div>

      {/* Summary + Pay */}
      {bill && (
        <div
          className={cn(
            'p-3 border-t space-y-1',
            darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white',
          )}
        >
          <SummaryRow label="Subtotal" value={formatCurrency(bill.subtotal)} dark={darkMode} />
          {bill.deliveryCharge > 0 && (
            <SummaryRow
              label="Delivery"
              value={formatCurrency(bill.deliveryCharge)}
              dark={darkMode}
            />
          )}
          {bill.packingCharge > 0 && (
            <SummaryRow
              label={formatPackingLabel(bill.packedItemCount)}
              value={formatCurrency(bill.packingCharge)}
              dark={darkMode}
            />
          )}
          {bill.taxAmount > 0 && (
            <SummaryRow label="GST" value={formatCurrency(bill.taxAmount)} dark={darkMode} />
          )}
          {bill.discount > 0 && (
            <SummaryRow
              label="Discount"
              value={`-${formatCurrency(bill.discount)}`}
              dark={darkMode}
              accent="red"
            />
          )}
          <SummaryRow
            label="Grand Total"
            value={formatCurrency(bill.grandTotal)}
            dark={darkMode}
            bold
          />

          {isManager && (
            <div className="flex gap-1 pt-2">
              <Input
                placeholder="Discount ₹"
                value={discountAmount}
                onChange={(e) => onDiscountChange(e.target.value)}
                className={cn('h-8 text-xs flex-1', darkMode ? 'bg-gray-800 border-gray-700' : '')}
              />
              <Input
                placeholder="PIN"
                value={managerPin}
                onChange={(e) => onManagerPinChange(e.target.value)}
                className={cn('h-8 text-xs w-14', darkMode ? 'bg-gray-800 border-gray-700' : '')}
                type="password"
              />
              <Button size="sm" variant="outline" onClick={onApplyDiscount}>
                Apply
              </Button>
            </div>
          )}

          <Button
            size="lg"
            className="w-full mt-2 h-12 text-base font-bold rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${POS_THEME.primary} 0%, ${POS_THEME.primaryLight} 100%)`,
            }}
            onClick={onPay}
            disabled={!bill.items.length || bill.billStatus !== 'OPEN'}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            PAY {formatCurrency(bill.grandTotal)}
          </Button>
        </div>
      )}
    </aside>
  );
}

function ActionChip({
  label,
  onClick,
  loading,
  disabled,
  primary,
  icon,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-[10px] font-bold transition',
        'disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]',
        primary ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
      )}
      style={primary ? { background: POS_THEME.primary } : undefined}
    >
      {icon}
      {loading ? '…' : label}
    </button>
  );
}

function QtyBtn({
  children,
  onClick,
  dark,
}: {
  children: React.ReactNode;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-1 rounded-lg transition',
        dark
          ? 'bg-gray-700 hover:bg-gray-600 text-white'
          : 'bg-white border border-gray-200 hover:bg-gray-100',
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  dark,
  bold,
  accent,
}: {
  label: string;
  value: string;
  dark: boolean;
  bold?: boolean;
  accent?: 'red';
}) {
  return (
    <div
      className={cn(
        'flex justify-between text-sm',
        bold && 'font-bold text-base pt-1 border-t mt-1',
      )}
    >
      <span className={bold ? (dark ? 'text-white' : 'text-gray-900') : 'text-gray-400'}>
        {label}
      </span>
      <span className={cn(bold && 'text-emerald-600', accent === 'red' && 'text-red-500')}>
        {value}
      </span>
    </div>
  );
}
