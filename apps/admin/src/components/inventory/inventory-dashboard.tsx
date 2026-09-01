'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@mdh/utils';
import type { InventoryDashboardDto } from '@mdh/types';
import {
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  ShoppingCart,
  TrendingDown,
  IndianRupee,
} from 'lucide-react';
import { cn, Badge } from '@mdh/ui';

const STAT_CARDS = [
  {
    key: 'stockValue',
    label: 'Total Stock Value',
    icon: IndianRupee,
    color: 'from-[#14532D] to-emerald-700',
    format: 'currency',
  },
  {
    key: 'lowStock',
    label: 'Low Stock Items',
    icon: AlertTriangle,
    color: 'from-amber-500 to-orange-500',
  },
  {
    key: 'outOfStock',
    label: 'Out of Stock',
    icon: XCircle,
    color: 'from-red-500 to-red-600',
  },
  {
    key: 'expiringSoon',
    label: 'Expiring Soon',
    icon: Clock,
    color: 'from-purple-500 to-purple-600',
  },
  {
    key: 'purchaseThisMonth',
    label: 'Purchase This Month',
    icon: ShoppingCart,
    color: 'from-teal-500 to-teal-600',
    format: 'currency',
  },
  {
    key: 'stockUsedToday',
    label: 'Stock Used Today',
    icon: Package,
    color: 'from-blue-500 to-blue-600',
    suffix: ' KG',
  },
  {
    key: 'wasteThisMonth',
    label: 'Waste This Month',
    icon: TrendingDown,
    color: 'from-rose-500 to-rose-600',
    format: 'currency',
  },
] as const;

export function InventoryDashboardView({
  data,
  loading,
}: {
  data?: InventoryDashboardDto;
  loading?: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const maxChart = Math.max(...data.consumptionChart.map((c) => c.value), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STAT_CARDS.map((card, i) => {
          const { key, label, icon: Icon, color } = card;
          const format = 'format' in card ? card.format : undefined;
          const val = data.stats[key as keyof typeof data.stats];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn('rounded-xl bg-gradient-to-br text-white p-4 shadow-sm', color)}
            >
              <div className="flex items-center gap-2 mb-1 opacity-90">
                <Icon className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-wide font-semibold">{label}</span>
              </div>
              <p className="text-xl lg:text-2xl font-bold">
                {format === 'currency'
                  ? formatCurrency(val as number)
                  : `${val}${'suffix' in card ? card.suffix : ''}`}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Consumption (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-36">
            {data.consumptionChart.map((c) => (
              <div key={c.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {c.value > 0 ? formatCurrency(c.value) : '—'}
                </span>
                <div
                  className="w-full rounded-t bg-[#14532D]/80 transition-all"
                  style={{ height: `${(c.value / maxChart) * 100}%`, minHeight: 4 }}
                />
                <span className="text-[9px] text-muted-foreground">{c.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Alerts
          </h3>
          {data.lowStockAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">All stock levels healthy</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStockAlerts.map((a) => (
                <li key={a.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {a.currentStock} {a.unit}
                    </p>
                    <Badge variant="outline" className="text-[9px]">
                      {a.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Widget title="Recent Purchases">
          {data.recentPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet</p>
          ) : (
            data.recentPurchases.map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-1.5 border-b">
                <div>
                  <p className="font-mono font-semibold">{p.poNumber}</p>
                  <p className="text-xs text-muted-foreground">{p.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(p.total)}</p>
                  <Badge variant="outline" className="text-[9px]">
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </Widget>

        <Widget title="Recent Adjustments">
          {data.recentAdjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No adjustments</p>
          ) : (
            data.recentAdjustments.map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1.5 border-b">
                <p>{a.item}</p>
                <span
                  className={cn('font-bold', a.quantity >= 0 ? 'text-emerald-600' : 'text-red-600')}
                >
                  {a.quantity >= 0 ? '+' : ''}
                  {a.quantity}
                </span>
              </div>
            ))
          )}
        </Widget>

        <Widget title="Top Consumed (30 days)">
          {data.topConsumed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consumption data</p>
          ) : (
            data.topConsumed.map((t, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b">
                <span>{t.name}</span>
                <span className="font-semibold">{t.quantity.toFixed(1)}</span>
              </div>
            ))
          )}
        </Widget>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Widget title="Recent Stock Movements">
          {!data.recentMovements?.length ? (
            <p className="text-sm text-muted-foreground">No stock movements yet</p>
          ) : (
            data.recentMovements.map((m) => (
              <div key={m.id} className="flex justify-between text-sm py-1.5 border-b gap-2">
                <div>
                  <p className="font-medium">{m.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type.replace('_', ' ')} {m.reference ? `· ${m.reference}` : ''}
                  </p>
                </div>
                <span className="font-bold shrink-0">{m.quantity}</span>
              </div>
            ))
          )}
        </Widget>
        <Widget title="Expiring Ingredients">
          {!data.expiringIngredients?.length ? (
            <p className="text-sm text-muted-foreground">No batches expiring soon</p>
          ) : (
            data.expiringIngredients.map((b) => (
              <div key={b.id} className="flex justify-between text-sm py-1.5 border-b">
                <div>
                  <p className="font-medium">{b.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
                <span className="text-amber-700 font-semibold text-xs">
                  {b.daysLeft != null ? `${b.daysLeft}d` : ''}
                </span>
              </div>
            ))
          )}
        </Widget>
        <Widget title="Inventory Value">
          {!data.inventoryValue?.length ? (
            <p className="text-sm text-muted-foreground">No ingredients added yet</p>
          ) : (
            data.inventoryValue.map((v) => (
              <div key={v.name} className="flex justify-between text-sm py-1.5 border-b">
                <span>
                  {v.name}{' '}
                  <span className="text-muted-foreground">
                    {v.quantity} {v.unit}
                  </span>
                </span>
                <span className="font-semibold">{formatCurrency(v.value)}</span>
              </div>
            ))
          )}
        </Widget>
      </div>
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      {children}
    </div>
  );
}
