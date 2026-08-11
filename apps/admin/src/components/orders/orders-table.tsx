'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Badge, Button } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import type { OrderDto } from '@mdh/types';
import { OrderStatus } from '@mdh/types';
import { api } from '@/lib/api';
import { OrderDrawer } from './order-drawer';
import { RejectOrderDialog } from './reject-order-dialog';

interface OrdersTableProps {
  orders: OrderDto[];
  onStatusChange: (id: string, status: OrderStatus) => void | Promise<void>;
  onReject: (id: string, reason: string) => void;
  loading?: boolean;
}

export function OrdersTable({ orders, onStatusChange, onReject, loading }: OrdersTableProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) {
      setSelectedOrderId(orderId);
      setDrawerOpen(true);
    }
  }, [searchParams]);

  const { data: selectedOrder } = useQuery({
    queryKey: ['admin-order', selectedOrderId],
    queryFn: () => api.get<OrderDto>(`/orders/${selectedOrderId}`),
    enabled: !!selectedOrderId && drawerOpen,
    staleTime: 0,
  });

  const columns = useMemo<ColumnDef<OrderDto>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: 'Order No',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">{row.original.orderNumber}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
      },
      {
        accessorKey: 'customerPhone',
        header: 'Phone',
      },
      {
        id: 'items',
        header: 'Order Items',
        cell: ({ row }) => {
          const summary = row.original.items
            .slice(0, 2)
            .map((i) => `${i.quantity} ${i.productName}`)
            .join(', ');
          return (
            <span className="text-sm text-muted-foreground">
              {summary}
              {row.original.items.length > 2 ? '…' : ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'grandTotal',
        header: 'Total',
        cell: ({ row }) => formatCurrency(row.original.grandTotal),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
      },
      {
        accessorKey: 'createdAt',
        header: 'Order Time',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline">{ORDER_STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              {order.status === OrderStatus.PENDING && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(order.id, OrderStatus.ACCEPTED)}
                    disabled={loading}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejectId(order.id)}
                    disabled={loading}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setDrawerOpen(true);
                }}
              >
                View
              </Button>
            </div>
          );
        },
      },
    ],
    [loading, onStatusChange],
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      {/* Mobile card view */}
      <div className="grid gap-3 md:hidden">
        {loading && (
          <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
            Loading orders…
          </div>
        )}
        {!loading && orders.length === 0 && (
          <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
            No orders found.
          </div>
        )}
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-[#14532D]">
                  {order.orderNumber}
                </p>
                <p className="font-semibold truncate">{order.customerName}</p>
                <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
              </div>
              <Badge variant="outline">{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold">{formatCurrency(order.grandTotal)}</p>
              <div className="flex flex-wrap gap-2">
                {order.status === OrderStatus.PENDING && (
                  <>
                    <Button
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => onStatusChange(order.id, OrderStatus.ACCEPTED)}
                      disabled={loading}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="min-h-[44px]"
                      onClick={() => setRejectId(order.id)}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-[44px]"
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setDrawerOpen(true);
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No orders found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50/80">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <OrderDrawer
        order={selectedOrder ?? orders.find((o) => o.id === selectedOrderId) ?? null}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedOrderId(null);
        }}
        onAccept={(id) => onStatusChange(id, OrderStatus.ACCEPTED)}
        onReject={(id) => setRejectId(id)}
        onStatusChange={onStatusChange}
        onResendEmail={async (id) => {
          await api.post(`/orders/${id}/resend-order-email`, {});
          queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
        }}
        loading={loading}
      />

      <RejectOrderDialog
        open={!!rejectId}
        onOpenChange={(open) => !open && setRejectId(null)}
        loading={loading}
        onConfirm={(reason) => {
          if (rejectId) {
            onReject(rejectId, reason);
            setRejectId(null);
            setDrawerOpen(false);
          }
        }}
      />
    </>
  );
}
