'use client';

import { useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { Button, cn } from '@mdh/ui';
import type { ActivityLogDto } from '@mdh/types';
import { ActivitySeverityBadge } from './activity-severity-badge';
import { ActivityModuleBadge } from './activity-module-badge';
import { ActivityDetailDrawer, highlight } from './activity-detail-drawer';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface ActivityTableProps {
  logs: ActivityLogDto[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  search?: string;
  loading?: boolean;
}

export function ActivityTable({
  logs,
  total,
  page,
  totalPages,
  onPageChange,
  search = '',
  loading,
}: ActivityTableProps) {
  const [selected, setSelected] = useState<ActivityLogDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns = useMemo<ColumnDef<ActivityLogDto>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date & Time',
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'userName',
        header: 'User',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {highlight(row.original.userName ?? 'System', search)}
          </span>
        ),
      },
      {
        accessorKey: 'userRole',
        header: 'Role',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.userRole ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'module',
        header: 'Module',
        cell: ({ row }) => <ActivityModuleBadge module={row.original.module} />,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <span className="text-xs font-semibold uppercase">{row.original.action}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-xs max-w-[200px] truncate block">
            {highlight(row.original.description ?? '—', search)}
          </span>
        ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        cell: ({ row }) => (
          <span className="font-mono text-[10px]">{row.original.ipAddress ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'device',
        header: 'Device',
        cell: ({ row }) => <span className="text-xs">{row.original.device ?? '—'}</span>,
      },
      {
        accessorKey: 'browser',
        header: 'Browser',
        cell: ({ row }) => <span className="text-xs">{row.original.browser ?? '—'}</span>,
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-xs max-w-[100px] truncate block">
            {row.original.location ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => <ActivitySeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className="text-[10px] font-bold uppercase">{row.original.status}</span>
        ),
      },
      {
        accessorKey: 'durationMs',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.durationMs ? `${row.original.durationMs}ms` : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setSelected(row.original);
              setDrawerOpen(true);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [search],
  );

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;
  }

  const paginationBar = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
      <p className="text-xs text-muted-foreground">
        {total.toLocaleString()} total · Page {page} of {totalPages || 1}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] flex-1 sm:flex-none"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] flex-1 sm:flex-none"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground text-sm">No activity logs found</p>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => {
                  setSelected(log);
                  setDrawerOpen(true);
                }}
                className="w-full text-left p-4 space-y-2 hover:bg-muted/30 active:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {highlight(log.userName ?? 'System', search)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ActivitySeverityBadge severity={log.severity} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActivityModuleBadge module={log.module} />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    {log.action}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {highlight(log.description ?? '—', search)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase">{log.status}</span>
                  <span className="text-xs text-[#14532D] font-semibold">View details →</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {paginationBar}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-muted/50 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    No activity logs found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelected(row.original);
                      setDrawerOpen(true);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {paginationBar}
      </div>

      <ActivityDetailDrawer log={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
