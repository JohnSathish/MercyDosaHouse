'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@mdh/ui';
import { Monitor, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserSessionDto } from '@mdh/types';

export default function ActivitySessionsPage() {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['activity-sessions'],
    queryFn: () => api.get<UserSessionDto[]>('/activity/sessions'),
    refetchInterval: 15_000,
  });

  async function terminateSession(sessionId: string) {
    await api.delete(`/activity/sessions/${sessionId}`);
    queryClient.invalidateQueries({ queryKey: ['activity-sessions'] });
  }

  if (isLoading) {
    return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Session Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Active sessions, devices, and online users — terminate suspicious sessions
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Sessions</p>
          <p className="text-2xl font-bold text-[#14532D]">{sessions?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Users Online</p>
          <p className="text-2xl font-bold">{sessions?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Retention</p>
          <p className="text-sm font-semibold mt-1">90 Days</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                {[
                  'User ID',
                  'Session',
                  'Device',
                  'Browser',
                  'IP',
                  'Location',
                  'Last Active',
                  'Duration',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions?.length ? (
                sessions.map((s) => {
                  const durationMs = Date.now() - new Date(s.createdAt).getTime();
                  const mins = Math.floor(durationMs / 60_000);
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{s.userId.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]">
                        {s.sessionId.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-2.5 text-xs flex items-center gap-1">
                        <Monitor className="h-3 w-3" /> {s.device ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs">{s.browser ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{s.ipAddress ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{s.location ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                        {new Date(s.lastActiveAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-xs">{mins}m</td>
                      <td className="px-4 py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => terminateSession(s.sessionId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                    No active sessions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
