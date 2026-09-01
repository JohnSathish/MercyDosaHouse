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
import { Badge, Button, cn } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { InventoryItemDto } from '@mdh/types';
import { InventoryItemStatus } from '@mdh/types';
import { Eye } from 'lucide-react';

const STATUS_COLORS: Record<InventoryItemStatus, string> = {
  [InventoryItemStatus.IN_STOCK]: 'bg-emerald-100 text-emerald-700',
  [InventoryItemStatus.LOW_STOCK]: 'bg-amber-100 text-amber-700',
  [InventoryItemStatus.OUT_OF_STOCK]: 'bg-red-100 text-red-700',
};

interface IngredientsTableProps {
  items: InventoryItemDto[];
  onSelect?: (id: string) => void;
}

export function IngredientsTable({ items, onSelect }: IngredientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<InventoryItemDto>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span>,
      },
      { accessorKey: 'name', header: 'Ingredient' },
      { accessorKey: 'categoryName', header: 'Category' },
      { accessorKey: 'unit', header: 'Unit' },
      {
        accessorKey: 'currentStock',
        header: 'Stock',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-bold',
              row.original.status !== InventoryItemStatus.IN_STOCK && 'text-red-600',
            )}
          >
            {row.original.currentStock} {row.original.unit}
          </span>
        ),
      },
      { accessorKey: 'minStock', header: 'Min', cell: ({ row }) => `${row.original.minStock}` },
      {
        accessorKey: 'costPrice',
        header: 'Cost',
        cell: ({ row }) => formatCurrency(row.original.costPrice),
      },
      {
        accessorKey: 'stockValue',
        header: 'Value',
        cell: ({ row }) => formatCurrency(row.original.stockValue),
      },
      {
        accessorKey: 'supplierName',
        header: 'Supplier',
        cell: ({ row }) => row.original.supplierName ?? '—',
      },
      {
        accessorKey: 'locationName',
        header: 'Location',
        cell: ({ row }) => row.original.locationName ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge className={cn('text-[10px]', STATUS_COLORS[row.original.status])}>
            {row.original.status.replace('_', ' ')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" onClick={() => onSelect?.(row.original.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onSelect],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
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
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                No ingredients added yet. Start by adding your first ingredient.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b hover:bg-muted/30 cursor-pointer"
                onClick={() => onSelect?.(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function IngredientsMobileCards({ items, onSelect }: IngredientsTableProps) {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect?.(item.id)}
          className="rounded-xl border bg-white dark:bg-gray-900 p-4 text-left"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
            </div>
            <Badge className={cn('text-[10px]', STATUS_COLORS[item.status])}>
              {item.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-bold">{item.currentStock}</p>
              <p className="text-muted-foreground">Stock</p>
            </div>
            <div>
              <p className="font-bold">{formatCurrency(item.costPrice)}</p>
              <p className="text-muted-foreground">Cost</p>
            </div>
            <div>
              <p className="font-bold">{formatCurrency(item.stockValue)}</p>
              <p className="text-muted-foreground">Value</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
