'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { api } from '@/lib/api';
import type { ActivityDashboardDto, ActivityInsightDto, ActivityLogDto } from '@mdh/types';
import { ActivityKpiCards } from '@/components/activity/activity-kpi-cards';
import { ActivityLiveFeed } from '@/components/activity/activity-live-feed';
import { ActivityByModuleChart, HourlyActivityChart } from '@/components/activity/activity-charts';
import { ActivityInsightsPanel } from '@/components/activity/activity-insights-panel';
import { ActivityFilterBar } from '@/components/activity/activity-filter-bar';
import { ActivityDetailDrawer } from '@/components/activity/activity-detail-drawer';
import { useActivitySocket } from '@/lib/use-activity-socket';
import type { ActivityPeriod } from '@mdh/types';

export default function ActivityOverviewPage() {
  const [period, setPeriod] = useState<ActivityPeriod>('today');
  const [selectedLog, setSelectedLog] = useState<ActivityLogDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['activity-dashboard', period],
    queryFn: () => api.get<ActivityDashboardDto>(`/activity/dashboard?period=${period}`),
    refetchInterval: 30_000,
  });

  const { data: insights } = useQuery({
    queryKey: ['activity-insights'],
    queryFn: () => api.get<ActivityInsightDto[]>('/activity/insights'),
  });

  const { connected, liveItems } = useActivitySocket();

  const feedItems = useMemo(() => {
    const base = dashboard?.recent ?? [];
    const merged = [...liveItems, ...base];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [liveItems, dashboard?.recent]);

  function openDetail(log: ActivityLogDto) {
    setSelectedLog(log);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <History className="h-6 w-6 text-[#14532D]" />
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            Audit Center
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Every admin action tracked with timestamp, user, and change details.
        </p>
      </div>

      <ActivityFilterBar
        period={period}
        onPeriodChange={setPeriod}
        search=""
        onSearchChange={() => {}}
        module=""
        onModuleChange={() => {}}
        severity=""
        onSeverityChange={() => {}}
      />

      <ActivityKpiCards stats={dashboard?.stats} loading={isLoading} />

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ActivityLiveFeed items={feedItems} connected={connected} onSelect={openDetail} />
        </div>
        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
          <ActivityByModuleChart data={dashboard?.analytics.byModule} />
          <HourlyActivityChart data={dashboard?.analytics.hourly} />
        </div>
      </div>

      <ActivityInsightsPanel insights={insights} />

      <ActivityDetailDrawer log={selectedLog} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
