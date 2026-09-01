'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download } from 'lucide-react';
import { Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';

type Range = 'today' | 'week' | 'month' | 'custom';

function rangeDates(range: Range, from: string, to: string) {
  const end = new Date();
  const start = new Date();
  if (range === 'today') start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - 7);
  if (range === 'month') start.setDate(1);
  if (range === 'custom') return { from, to };
  return { from: start.toISOString(), to: end.toISOString() };
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n');
}

export default function InventoryReportsPage() {
  const [type, setType] = useState('valuation');
  const [range, setRange] = useState<Range>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const dates = useMemo(() => rangeDates(range, from, to), [range, from, to]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['inventory-reports', type, dates.from, dates.to],
    queryFn: () =>
      api.get<Array<Record<string, unknown>>>(
        `/inventory/reports?type=${type}&from=${encodeURIComponent(dates.from)}&to=${encodeURIComponent(dates.to)}`,
      ),
  });

  const download = (ext: 'csv' | 'xls') => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], {
      type: ext === 'xls' ? 'application/vnd.ms-excel' : 'text/csv',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-${type}.${ext === 'xls' ? 'xls' : 'csv'}`;
    a.click();
  };

  const printPdf = () => window.print();

  return (
    <div className="space-y-6 print:p-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-[#14532D]" /> Inventory Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live figures from Mercy Dosa House stock ledger
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => download('csv')}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => download('xls')}>
            Excel
          </Button>
          <Button variant="outline" onClick={printPdf}>
            PDF
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {['valuation', 'purchase', 'consumption', 'waste'].map((t) => (
          <Button
            key={t}
            size="sm"
            variant={type === t ? 'default' : 'outline'}
            className={type === t ? 'bg-[#14532D]' : ''}
            onClick={() => setType(t)}
          >
            {t}
          </Button>
        ))}
        {(['today', 'week', 'month', 'custom'] as Range[]).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? 'default' : 'outline'}
            onClick={() => setRange(r)}
          >
            {r === 'week'
              ? 'This Week'
              : r === 'month'
                ? 'This Month'
                : r === 'today'
                  ? 'Today'
                  : 'Custom'}
          </Button>
        ))}
        {range === 'custom' ? (
          <>
            <input
              type="date"
              className="h-9 rounded-lg border px-2 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className="h-9 rounded-lg border px-2 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </>
        ) : null}
      </div>
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      ) : !rows.length ? (
        <p className="text-muted-foreground">No data for this report yet.</p>
      ) : (
        <div className="rounded-xl border overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                {Object.keys(rows[0]).map((h) => (
                  <th key={h} className="px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b">
                  {Object.entries(row).map(([k, v]) => (
                    <td key={k} className="px-3 py-2">
                      {typeof v === 'number' && /value|amount|cost|total/i.test(k)
                        ? formatCurrency(v)
                        : String(v ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
