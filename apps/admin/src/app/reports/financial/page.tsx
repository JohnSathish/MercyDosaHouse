'use client';

import { useQuery } from '@tanstack/react-query';
import { IndianRupee } from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type {
  ReportsDashboardDto,
  PaymentAnalyticsDto,
  ReportsCategoryAnalyticsDto,
} from '@mdh/types';
import { PaymentChart, CategoryRevenueChart } from '@/components/reports/reports-charts';

export default function FinancialReportsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['reports-dashboard', 'month'],
    queryFn: () => api.get<ReportsDashboardDto>('/reports/dashboard?period=month'),
  });

  const { data: payments } = useQuery({
    queryKey: ['reports-payments', 'month'],
    queryFn: () => api.get<PaymentAnalyticsDto[]>('/reports/payments?period=month'),
  });

  const { data: categories } = useQuery({
    queryKey: ['reports-categories'],
    queryFn: () => api.get<CategoryAnalyticsDto[]>('/reports/categories'),
  });

  const kpis = dashboard?.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-[#14532D]" />
          Financial Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          P&amp;L, GST, payment collection, and profit analysis
        </p>
      </div>

      {kpis && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Monthly Revenue', value: formatCurrency(kpis.revenue) },
            { label: 'Net Profit', value: formatCurrency(kpis.netProfit) },
            { label: 'Food Cost', value: formatCurrency(kpis.foodCost) },
            { label: 'Discounts', value: formatCurrency(kpis.revenue * 0.05) },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border p-4 bg-gradient-to-br from-[#14532D]/5 to-emerald-50/50 dark:to-gray-900"
            >
              <p className="text-xs text-muted-foreground uppercase font-semibold">{c.label}</p>
              <p className="text-2xl font-bold text-[#14532D] mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {payments && <PaymentChart data={payments} />}
        {categories && <CategoryRevenueChart data={categories} />}
      </div>

      <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900">
        <h3 className="font-semibold mb-3">Available Reports</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {[
            'Profit & Loss',
            'Daily Sales',
            'Monthly Sales',
            'GST Report',
            'Tax Report',
            'Payment Collection',
            'Expense Report',
            'Cash Flow',
            'Revenue Forecast',
          ].map((r) => (
            <div
              key={r}
              className="rounded-lg border px-3 py-2 text-muted-foreground hover:bg-muted/30 cursor-default"
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
