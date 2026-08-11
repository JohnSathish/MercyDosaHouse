'use client';

import { Fragment, useMemo, useState } from 'react';
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
import type { DeliveryOrderDto, DeliveryExecutiveDetailDto } from '@mdh/types';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { UserPlus, Zap, Eye, Navigation } from 'lucide-react';

interface DeliveryOrdersTableProps {
  orders: DeliveryOrderDto[];
  executives?: DeliveryExecutiveDetailDto[];
  onAssign?: (orderId: string, staffId: string) => void;
  onAutoAssign?: (orderId: string) => void;
  onView?: (orderId: string) => void;
  loading?: boolean;
}

export function DeliveryOrdersTable({
  orders,
  executives = [],
  onAssign,
  onAutoAssign,
  onView,
  loading,
}: DeliveryOrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<DeliveryOrderDto>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: 'Order No',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold">{row.original.orderNumber}</span>
        ),
      },
      { accessorKey: 'customerName', header: 'Customer' },
      {
        accessorKey: 'customerPhone',
        header: 'Phone',
        cell: ({ row }) => <span className="text-xs">{row.original.customerPhone}</span>,
      },
      {
        id: 'items',
        header: 'Items',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.items
              .map((i) => `${i.quantity}× ${i.productName}`)
              .join(', ')
              .slice(0, 40)}
            {row.original.items.length > 1 ? '…' : ''}
          </span>
        ),
      },
      {
        accessorKey: 'deliveryAddress',
        header: 'Address',
        cell: ({ row }) => (
          <span className="text-xs max-w-[180px] truncate block">
            {row.original.deliveryAddress}
          </span>
        ),
      },
      {
        id: 'distance',
        header: 'Distance',
        cell: ({ row }) =>
          row.original.assignment?.distanceKm != null
            ? `${row.original.assignment.distanceKm.toFixed(1)} km`
            : '—',
      },
      {
        accessorKey: 'grandTotal',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-bold">{formatCurrency(row.original.grandTotal)}</span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {row.original.paymentMethod}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <DeliveryStatusBadge status={row.original.assignment?.status ?? 'WAITING'} />
        ),
      },
      {
        id: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) => row.original.assignment?.executive?.name ?? '—',
      },
      {
        id: 'eta',
        header: 'ETA',
        cell: ({ row }) =>
          row.original.assignment?.etaMinutes != null
            ? `${row.original.assignment.etaMinutes} min`
            : '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const order = row.original;
          const isWaiting = !order.assignment || order.assignment.status === 'WAITING';
          return (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => onView?.(order.id)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {isWaiting && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Auto assign"
                    onClick={() => onAutoAssign?.(order.id)}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Manual assign"
                    onClick={() => setAssigningId(assigningId === order.id ? null : order.id)}
                  >
                    <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                  </Button>
                </>
              )}
              {order.assignment?.status === 'OUT_FOR_DELIVERY' && (
                <Button size="sm" variant="ghost" title="Track">
                  <Navigation className="h-3.5 w-3.5 text-purple-500" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [assigningId, onAssign, onAutoAssign, onView],
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  const isWaiting = (order: DeliveryOrderDto) =>
    !order.assignment || order.assignment.status === 'WAITING';

  return (
    <div className="space-y-2">
      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {orders.length === 0 ? (
          <div className="rounded-xl border bg-white dark:bg-gray-900 p-8 text-center text-muted-foreground text-sm">
            No delivery orders found
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-[#14532D]">{order.orderNumber}</p>
                  <p className="font-semibold truncate">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                </div>
                <DeliveryStatusBadge status={order.assignment?.status ?? 'WAITING'} />
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{order.deliveryAddress}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-bold">{formatCurrency(order.grandTotal)}</span>
                <Badge variant="outline" className="text-[10px]">
                  {order.paymentMethod}
                </Badge>
              </div>

              {order.assignment?.executive?.name ? (
                <p className="text-xs text-muted-foreground">
                  Assigned: {order.assignment.executive.name}
                  {order.assignment.etaMinutes != null
                    ? ` · ETA ${order.assignment.etaMinutes} min`
                    : ''}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] flex-1"
                  onClick={() => onView?.(order.id)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
                {isWaiting(order) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px]"
                      title="Auto assign"
                      onClick={() => onAutoAssign?.(order.id)}
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px]"
                      title="Manual assign"
                      onClick={() => setAssigningId(assigningId === order.id ? null : order.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                  </>
                )}
              </div>

              {assigningId === order.id && executives.length > 0 && (
                <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
                  <p className="text-xs font-semibold">Assign to executive:</p>
                  <div className="flex flex-wrap gap-2">
                    {executives.map((e) => (
                      <Button
                        key={e.id}
                        size="sm"
                        variant="outline"
                        className="text-xs min-h-[44px]"
                        onClick={() => {
                          onAssign?.(order.id, e.id);
                          setAssigningId(null);
                        }}
                      >
                        {e.user?.name ?? e.employeeId} ({e.activeOrders} active)
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/40">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
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
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No delivery orders found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {assigningId === row.original.id && executives.length > 0 && (
                    <tr key={`${row.id}-assign`} className="bg-blue-50/50 dark:bg-blue-950/20">
                      <td colSpan={columns.length} className="px-4 py-3">
                        <p className="text-xs font-semibold mb-2">Assign to executive:</p>
                        <div className="flex flex-wrap gap-2">
                          {executives.map((e) => (
                            <Button
                              key={e.id}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                onAssign?.(row.original.id, e.id);
                                setAssigningId(null);
                              }}
                            >
                              {e.user?.name ?? e.employeeId} ({e.activeOrders} active)
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
