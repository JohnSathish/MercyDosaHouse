'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ActivityLogsPageDto, ActivityPeriod } from '@mdh/types';
import { ActivityFilterBar } from '@/components/activity/activity-filter-bar';
import { ActivityTable } from '@/components/activity/activity-table';
import { useActivitySocket } from '@/lib/use-activity-socket';

export default function ActivityLogsPage() {
  const [period, setPeriod] = useState<ActivityPeriod>('week');
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);

  useActivitySocket();

  const params = new URLSearchParams({
    period,
    page: String(page),
    limit: '25',
    ...(search && { search }),
    ...(module && { module }),
    ...(severity && { severity }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', period, search, module, severity, page],
    queryFn: () => api.get<ActivityLogsPageDto>(`/activity/logs?${params}`),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">All Activity Logs</h1>
        <p className="text-sm text-muted-foreground">
          Searchable audit trail with advanced filters
        </p>
      </div>

      <ActivityFilterBar
        period={period}
        onPeriodChange={(p) => {
          setPeriod(p);
          setPage(1);
        }}
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        module={module}
        onModuleChange={(m) => {
          setModule(m);
          setPage(1);
        }}
        severity={severity}
        onSeverityChange={(s) => {
          setSeverity(s);
          setPage(1);
        }}
      />

      <ActivityTable
        logs={data?.data ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        search={search}
        loading={isLoading}
      />
    </div>
  );
}
