'use client';

import { Fragment } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '@mdh/utils';
import type {
  SalesAnalyticsDto,
  OrderAnalyticsDto,
  PaymentAnalyticsDto,
  ReportsCategoryAnalyticsDto,
} from '@mdh/types';

const COLORS = ['#14532D', '#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444'];

export function RevenueByHourChart({ data }: { data: SalesAnalyticsDto['byHour'] }) {
  const chartData = data.map((d) => ({
    label: `${d.hour}:00`,
    revenue: d.revenue,
    orders: d.orders,
  }));

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm h-80">
      <h3 className="font-semibold mb-4">Revenue by Hour</h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14532D" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#14532D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#14532D"
            fill="url(#revGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueByDayChart({ data }: { data: SalesAnalyticsDto['byDay'] }) {
  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm h-80">
      <h3 className="font-semibold mb-4">Revenue by Day</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v: number, name: string) => (name === 'revenue' ? formatCurrency(v) : v)}
          />
          <Bar dataKey="revenue" fill="#14532D" radius={[4, 4, 0, 0]} />
          <Bar dataKey="orders" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderStatusDonut({ data }: { data: OrderAnalyticsDto['byStatus'] }) {
  const chartData = data.map((d) => ({ name: d.status, value: d.count }));
  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm h-80">
      <h3 className="font-semibold mb-4">Orders by Status</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentChart({ data }: { data: PaymentAnalyticsDto[] }) {
  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm h-80">
      <h3 className="font-semibold mb-4">Payment Methods</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="method" tick={{ fontSize: 10 }} width={60} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="amount" fill="#14532D" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryRevenueChart({ data }: { data: ReportsCategoryAnalyticsDto[] }) {
  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm h-80">
      <h3 className="font-semibold mb-4">Revenue by Category</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="revenue" fill="#14532D" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HeatmapChart({
  data,
}: {
  data: { day: string; hours: { hour: number; count: number }[] }[];
}) {
  const max = Math.max(...data.flatMap((d) => d.hours.map((h) => h.count)), 1);

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm overflow-x-auto">
      <h3 className="font-semibold mb-4">Busy Hours Heatmap</h3>
      <div className="min-w-[600px]">
        <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-0.5 text-[8px]">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-muted-foreground">
              {h}
            </div>
          ))}
          {data.map((row) => (
            <Fragment key={row.day}>
              <div className="text-xs font-semibold flex items-center">{row.day}</div>
              {row.hours.map((h) => (
                <div
                  key={`${row.day}-${h.hour}`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: `rgba(20, 83, 45, ${0.1 + (h.count / max) * 0.9})`,
                  }}
                  title={`${row.day} ${h.hour}:00 — ${h.count} orders`}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
