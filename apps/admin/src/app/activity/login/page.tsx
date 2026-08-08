'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, KeyRound } from 'lucide-react';
import { cn } from '@mdh/ui';
import { api } from '@/lib/api';
import type { LoginHistoryDto } from '@mdh/types';

export default function ActivityLoginPage() {
  const { data: logins, isLoading } = useQuery({
    queryKey: ['activity-login-history'],
    queryFn: () => api.get<LoginHistoryDto[]>('/activity/login-history?limit=100'),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Login History</h1>
        <p className="text-sm text-muted-foreground">
          Successful logins, failed attempts, logouts, and session events
        </p>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                {[
                  'Time',
                  'Email',
                  'Status',
                  'IP Address',
                  'Device',
                  'Browser',
                  'Location',
                  'Reason',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logins?.length ? (
                logins.map((row) => {
                  const Icon = row.success ? CheckCircle2 : XCircle;
                  return (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-sm">{row.email ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-bold',
                            row.success ? 'text-emerald-600' : 'text-red-600',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {row.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{row.ipAddress ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{row.device ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{row.browser ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{row.location ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-red-600">{row.failReason ?? '—'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No login history recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { label: 'Successful Login', icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Failed Login', icon: XCircle, color: 'text-red-600' },
          { label: 'Session Timeout', icon: Clock, color: 'text-orange-600' },
          { label: 'Password Reset', icon: KeyRound, color: 'text-blue-600' },
        ].map(({ label, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border p-3 flex items-center gap-2">
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-xs font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
