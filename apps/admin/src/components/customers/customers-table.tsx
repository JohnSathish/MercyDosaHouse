'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import type { CustomerListItemDto } from '@mdh/types';
import { LoyaltyTier } from '@mdh/types';
import { api } from '@/lib/api';
import { CustomerDrawer } from './customer-drawer';
import { Eye, Star } from 'lucide-react';

const TIER_COLORS: Record<LoyaltyTier, string> = {
  [LoyaltyTier.BRONZE]: 'bg-orange-100 text-orange-700',
  [LoyaltyTier.SILVER]: 'bg-gray-100 text-gray-700',
  [LoyaltyTier.GOLD]: 'bg-amber-100 text-amber-700',
  [LoyaltyTier.PLATINUM]: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-600',
  Blocked: 'bg-red-100 text-red-700',
};

function CustomerAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-[#14532D]/20"
      />
    );
  }

  return (
    <div className="h-9 w-9 rounded-full bg-[#14532D] text-white flex items-center justify-center text-xs font-bold">
      {initials}
    </div>
  );
}

interface CustomersTableProps {
  customers: CustomerListItemDto[];
  onRefresh: () => void;
}

export function CustomersTable({ customers, onRefresh }: CustomersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: customerDetail } = useQuery({
    queryKey: ['customer-detail', selectedId],
    queryFn: () => api.get(`/customers/${selectedId}`),
    enabled: !!selectedId && drawerOpen,
  });

  const columns = useMemo<ColumnDef<CustomerListItemDto>[]>(
    () => [
      {
        accessorKey: 'customerId',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.customerId}</span>
        ),
      },
      {
        id: 'photo',
        header: 'Photo',
        cell: ({ row }) => (
          <CustomerAvatar name={row.original.name} avatarUrl={row.original.avatarUrl} />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.isVip && (
              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400" /> VIP
              </span>
            )}
          </div>
        ),
      },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email ?? '—',
      },
      {
        accessorKey: 'totalOrders',
        header: 'Orders',
        cell: ({ row }) => <span className="font-semibold">{row.original.totalOrders}</span>,
      },
      {
        accessorKey: 'totalSpent',
        header: 'Spent',
        cell: ({ row }) => formatCurrency(row.original.totalSpent),
      },
      {
        accessorKey: 'rewardPoints',
        header: 'Points',
        cell: ({ row }) => (
          <span className="font-semibold text-[#F59E0B]">{row.original.rewardPoints}</span>
        ),
      },
      {
        accessorKey: 'customerType',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {row.original.customerType}
          </Badge>
        ),
      },
      {
        accessorKey: 'loyaltyTier',
        header: 'Tier',
        cell: ({ row }) => (
          <Badge className={cn('text-[10px]', TIER_COLORS[row.original.loyaltyTier])}>
            {row.original.loyaltyTier}
          </Badge>
        ),
      },
      {
        accessorKey: 'lastOrderAt',
        header: 'Last Order',
        cell: ({ row }) =>
          row.original.lastOrderAt
            ? new Date(row.original.lastOrderAt).toLocaleDateString('en-IN')
            : '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge className={cn('text-[10px]', STATUS_COLORS[row.original.status] ?? '')}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedId(row.original.id);
                setDrawerOpen(true);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: customers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b bg-muted/40">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
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
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedId(row.original.id);
                      setDrawerOpen(true);
                    }}
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
      </div>

      <CustomerDrawer
        customer={customerDetail ?? null}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedId(null);
        }}
        onRefresh={onRefresh}
      />
    </>
  );
}

// Mobile card view
export function CustomersMobileCards({
  customers,
  onSelect,
}: {
  customers: CustomerListItemDto[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {customers.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="rounded-xl border bg-white dark:bg-gray-900 p-4 text-left shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <CustomerAvatar name={c.name} avatarUrl={c.avatarUrl} />
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </div>
            <Badge className={cn('ml-auto text-[10px]', STATUS_COLORS[c.status])}>{c.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-bold">{c.totalOrders}</p>
              <p className="text-muted-foreground">Orders</p>
            </div>
            <div>
              <p className="font-bold">{formatCurrency(c.totalSpent)}</p>
              <p className="text-muted-foreground">Spent</p>
            </div>
            <div>
              <p className="font-bold text-[#F59E0B]">{c.rewardPoints}</p>
              <p className="text-muted-foreground">Points</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
