'use client';

import { useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { formatCurrency } from '@mdh/utils';
import type { ProductPerformanceDto } from '@mdh/types';
import { Badge } from '@mdh/ui';

export function ProductPerformanceTable({
  products,
  loading,
}: {
  products: ProductPerformanceDto[];
  loading?: boolean;
}) {
  const columns = useMemo<ColumnDef<ProductPerformanceDto>[]>(
    () => [
      {
        id: 'image',
        header: '',
        cell: ({ row }) => (
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">
            {row.original.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.imageUrl}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              '🍽'
            )}
          </div>
        ),
      },
      { accessorKey: 'name', header: 'Menu Item' },
      { accessorKey: 'category', header: 'Category' },
      { accessorKey: 'quantity', header: 'Orders' },
      {
        accessorKey: 'revenue',
        header: 'Revenue',
        cell: ({ row }) => (
          <span className="font-bold">{formatCurrency(row.original.revenue)}</span>
        ),
      },
      {
        accessorKey: 'profit',
        header: 'Profit',
        cell: ({ row }) => formatCurrency(row.original.profit),
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => `${row.original.rating} ★`,
      },
      {
        accessorKey: 'prepTimeMinutes',
        header: 'Prep',
        cell: ({ row }) => `${row.original.prepTimeMinutes}m`,
      },
      {
        accessorKey: 'popularityScore',
        header: 'Popularity',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {row.original.popularityScore}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({ data: products, columns, getCoreRowModel: getCoreRowModel() });

  if (loading) return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b bg-muted/40">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/20">
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
