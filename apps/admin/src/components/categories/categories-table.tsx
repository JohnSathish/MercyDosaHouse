'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { formatCurrency } from '@mdh/utils';
import type { AdminCategoryDto } from '@mdh/types';
import { Button, cn } from '@mdh/ui';
import { CategoryStatusBadge, CategoryBadgePill } from './category-badges';
import { Edit, Eye, Copy, Trash2, GripVertical } from 'lucide-react';

interface CategoriesTableProps {
  categories: AdminCategoryDto[];
  selected: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onEdit?: (id: string) => void;
  onPreview?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CategoriesTable({
  categories,
  selected,
  onSelect,
  onSelectAll,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
}: CategoriesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<AdminCategoryDto>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={selected.size === categories.length && categories.length > 0}
            onChange={onSelectAll}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selected.has(row.original.id)}
            onChange={() => onSelect(row.original.id)}
          />
        ),
      },
      {
        id: 'order',
        header: '#',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-muted-foreground">
            <GripVertical className="h-3 w-3" />
            {row.original.sortOrder}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Category',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">
              {row.original.icon ?? '🍽'} {row.original.name}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">{row.original.slug}</p>
          </div>
        ),
      },
      { accessorKey: 'itemCount', header: 'Items' },
      {
        id: 'revenue',
        header: 'Revenue',
        cell: ({ row }) => formatCurrency(row.original.analytics.revenue),
      },
      {
        id: 'orders',
        header: 'Orders',
        cell: ({ row }) => row.original.analytics.orders,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <CategoryStatusBadge status={row.original.status} />,
      },
      {
        id: 'badge',
        header: 'Badge',
        cell: ({ row }) =>
          row.original.badge ? <CategoryBadgePill badge={row.original.badge} /> : '—',
      },
      {
        id: 'featured',
        header: 'Featured',
        cell: ({ row }) => (row.original.isFeatured ? '⭐' : '—'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit?.(row.original.id)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onPreview?.(row.original.id)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDuplicate?.(row.original.id)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete?.(row.original.id)}>
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [categories.length, selected, onSelect, onSelectAll, onEdit, onPreview, onDuplicate, onDelete],
  );

  const table = useReactTable({
    data: categories,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b bg-muted/40">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'border-b hover:bg-muted/20 transition-colors',
                selected.has(row.original.id) && 'bg-[#14532D]/5',
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
