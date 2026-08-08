'use client';

import { useState } from 'react';
import { Download, Mail, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type { ReportPeriod } from '@mdh/types';

const REPORT_TYPES = [
  { id: 'summary', label: 'Business Summary', formats: ['CSV', 'PDF'] },
  { id: 'sales', label: 'Sales Report', formats: ['CSV', 'Excel'] },
  { id: 'products', label: 'Product Performance', formats: ['CSV', 'Excel'] },
  { id: 'financial', label: 'Financial Report', formats: ['CSV', 'PDF'] },
  { id: 'delivery', label: 'Delivery Report', formats: ['CSV'] },
  { id: 'inventory', label: 'Inventory Report', formats: ['CSV', 'Excel'] },
];

const SCHEDULES = ['Daily', 'Weekly', 'Monthly'];

export default function ExportReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month');

  async function exportCsv() {
    const res = await api.get<{ csv: string }>(`/reports/export?period=${period}`);
    const blob = new Blob([res.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="h-6 w-6 text-[#14532D]" />
          Export Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Export, print, and schedule automated reports
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-semibold">{r.label}</h3>
            <div className="flex flex-wrap gap-1 mt-2">
              {r.formats.map((f) => (
                <span
                  key={f}
                  className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-semibold"
                >
                  {f}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4" /> Scheduled Reports
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {(['today', 'week', 'month'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${period === p ? 'bg-[#14532D] text-white' : 'bg-muted'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {SCHEDULES.map((s) => (
            <div key={s} className="rounded-xl border p-4">
              <p className="font-semibold text-sm">{s} Email Report</p>
              <p className="text-xs text-muted-foreground mt-1">Send to admin@mercydosahouse.com</p>
              <Button size="sm" className="mt-3 bg-[#14532D]" variant="default">
                Enable
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
