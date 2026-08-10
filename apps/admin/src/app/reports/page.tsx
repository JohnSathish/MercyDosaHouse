'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download } from 'lucide-react';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type {
  ReportPeriod,
  ReportsDashboardDto,
  SalesAnalyticsDto,
  OrderAnalyticsDto,
  PaymentAnalyticsDto,
  ReportsCategoryAnalyticsDto,
  ProductPerformanceDto,
  ReportInsightDto,
  HeatmapDayDto,
  PackingAnalyticsDto,
} from '@mdh/types';
import { ReportsFilterBar } from '@/components/reports/reports-filter-bar';
import { ReportsKpiCards } from '@/components/reports/reports-kpi-cards';
import { InsightsPanel } from '@/components/reports/insights-panel';
import {
  RevenueByHourChart,
  RevenueByDayChart,
  OrderStatusDonut,
  PaymentChart,
  CategoryRevenueChart,
  HeatmapChart,
} from '@/components/reports/reports-charts';
import { ProductPerformanceTable } from '@/components/reports/product-performance-table';

export default function ReportsOverviewPage() {
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [paymentMethod, setPaymentMethod] = useState('');

  const params = new URLSearchParams({
    period,
    ...(paymentMethod && { paymentMethod }),
  }).toString();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['reports-dashboard', period, paymentMethod],
    queryFn: () => api.get<ReportsDashboardDto>(`/reports/dashboard?${params}`),
    refetchInterval: 60_000,
  });

  const { data: sales } = useQuery({
    queryKey: ['reports-sales', period],
    queryFn: () => api.get<SalesAnalyticsDto>(`/reports/sales?period=${period}`),
  });

  const { data: orders } = useQuery({
    queryKey: ['reports-orders', period],
    queryFn: () => api.get<OrderAnalyticsDto>(`/reports/orders?period=${period}`),
  });

  const { data: payments } = useQuery({
    queryKey: ['reports-payments', period],
    queryFn: () => api.get<PaymentAnalyticsDto[]>(`/reports/payments?period=${period}`),
  });

  const { data: categories } = useQuery({
    queryKey: ['reports-categories'],
    queryFn: () => api.get<ReportsCategoryAnalyticsDto[]>('/reports/categories'),
  });

  const { data: products } = useQuery({
    queryKey: ['reports-products'],
    queryFn: () => api.get<ProductPerformanceDto[]>('/reports/products?limit=10'),
  });

  const { data: insights } = useQuery({
    queryKey: ['reports-insights'],
    queryFn: () => api.get<ReportInsightDto[]>('/reports/insights'),
  });

  const { data: heatmap } = useQuery({
    queryKey: ['reports-heatmap'],
    queryFn: () => api.get<HeatmapDayDto[]>('/reports/heatmap'),
  });

  const { data: packing } = useQuery({
    queryKey: ['reports-packing', period],
    queryFn: () => api.get<PackingAnalyticsDto>(`/reports/packing?period=${period}`),
  });

  async function exportReport() {
    const res = await api.get<{ csv: string }>(`/reports/export?${params}`);
    const blob = new Blob([res.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#14532D]" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time insights, analytics, and AI-powered recommendations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportReport}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <ReportsFilterBar
        period={period}
        onPeriodChange={setPeriod}
        paymentMethod={paymentMethod}
        onPaymentChange={setPaymentMethod}
      />

      <ReportsKpiCards kpis={dashboard?.kpis} live={dashboard?.live} loading={isLoading} />

      <InsightsPanel insights={insights} />

      <div className="grid lg:grid-cols-2 gap-4">
        {sales && <RevenueByHourChart data={sales.byHour} />}
        {sales && <RevenueByDayChart data={sales.byDay} />}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {orders && <OrderStatusDonut data={orders.byStatus} />}
        {payments && <PaymentChart data={payments} />}
        {categories && <CategoryRevenueChart data={categories} />}
      </div>

      {heatmap && <HeatmapChart data={heatmap} />}

      {packing && packing.topPackedItems.length > 0 && (
        <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900">
          <h3 className="font-semibold mb-3">Top Packed Items</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {packing.topPackedItems.slice(0, 6).map((item) => (
              <div key={item.productId} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {item.quantity} items · packing revenue tracked
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">Top Products</h3>
        <ProductPerformanceTable products={products ?? []} loading={!products} />
      </div>
    </div>
  );
}
