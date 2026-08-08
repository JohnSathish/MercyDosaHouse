'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import type { ActivityDashboardDto } from '@mdh/types';
import { getModuleConfig } from './activity-module-badge';

export function ActivityByModuleChart({
  data,
}: {
  data?: ActivityDashboardDto['analytics']['byModule'];
}) {
  if (!data?.length) {
    return <div className="h-56 rounded-2xl bg-muted animate-pulse" />;
  }

  const chartData = data.map((d) => ({
    name: getModuleConfig(d.module).label,
    count: d.count,
  }));

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
      <h3 className="font-semibold text-sm mb-3">Activities by Module</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#14532D" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyActivityChart({
  data,
}: {
  data?: ActivityDashboardDto['analytics']['hourly'];
}) {
  if (!data?.length) {
    return <div className="h-56 rounded-2xl bg-muted animate-pulse" />;
  }

  const chartData = data.map((d) => ({
    hour: `${String(d.hour).padStart(2, '0')}:00`,
    count: d.count,
  }));

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
      <h3 className="font-semibold text-sm mb-3">Hourly Activity</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#14532D" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
