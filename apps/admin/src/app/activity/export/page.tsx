'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type { ActivityPeriod } from '@mdh/types';

const FORMATS = [
  { id: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: 'Spreadsheet-compatible export' },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: 'Microsoft Excel format (.xlsx)' },
  { id: 'pdf', label: 'PDF', icon: FileText, desc: 'Print-ready audit report' },
  { id: 'json', label: 'JSON', icon: FileJson, desc: 'Machine-readable API format' },
];

const SCHEDULES = ['Daily', 'Weekly', 'Monthly'];

export default function ActivityExportPage() {
  const [period, setPeriod] = useState<ActivityPeriod>('week');
  const [exporting, setExporting] = useState(false);

  const { data: preview } = useQuery({
    queryKey: ['activity-export-preview', period],
    queryFn: () => api.get<{ csv: string; filename: string }>(`/activity/export?period=${period}`),
  });

  async function downloadCsv() {
    setExporting(true);
    try {
      const res = await api.get<{ csv: string; filename: string }>(
        `/activity/export?period=${period}`,
      );
      const blob = new Blob([res.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename ?? 'activity-logs.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const rowCount = preview?.csv ? Math.max(0, preview.csv.split('\n').length - 1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Export Center</h1>
        <p className="text-sm text-muted-foreground">
          Export audit logs for compliance and reporting
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['today', 'week', 'month'] as ActivityPeriod[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
            className={period === p ? 'bg-[#14532D] hover:bg-[#14532D]/90' : ''}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
          </Button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FORMATS.map(({ id, label, icon: Icon, desc }) => (
          <div key={id} className="rounded-2xl border p-4 hover:shadow-md transition-shadow">
            <Icon className="h-8 w-8 text-[#14532D] mb-3" />
            <h3 className="font-semibold">{label}</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{desc}</p>
            <Button
              size="sm"
              className="w-full bg-[#14532D] hover:bg-[#14532D]/90"
              disabled={exporting || id !== 'csv'}
              onClick={downloadCsv}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {id === 'csv' ? 'Download' : 'Coming Soon'}
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-5">
        <h3 className="font-semibold mb-3">Scheduled Exports</h3>
        <div className="flex flex-wrap gap-2">
          {SCHEDULES.map((s) => (
            <span
              key={s}
              className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground"
            >
              {s} — Configure in Settings
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <h3 className="font-semibold mb-2">Export Preview</h3>
        <p className="text-sm text-muted-foreground mb-3">{rowCount} records ready for export</p>
        {preview?.csv && (
          <pre className="text-[10px] font-mono bg-muted/50 rounded-xl p-3 overflow-x-auto max-h-48">
            {preview.csv.split('\n').slice(0, 6).join('\n')}
            {rowCount > 5 ? '\n…' : ''}
          </pre>
        )}
      </div>

      <div className="rounded-2xl border p-5 bg-muted/20">
        <h3 className="font-semibold mb-2">Retention Policy</h3>
        <p className="text-sm text-muted-foreground">
          Logs are retained for 90 days by default. Options: 30 Days, 90 Days, 180 Days, 1 Year,
          Forever. Automatic archival support is planned for compliance (ISO/GDPR-ready).
        </p>
      </div>
    </div>
  );
}
