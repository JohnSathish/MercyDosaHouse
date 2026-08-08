'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Upload, Users } from 'lucide-react';
import { Button, cn } from '@mdh/ui';
import { api } from '@/lib/api';
import type { CustomerDashboardDto, CustomerListItemDto, CustomerFilter } from '@mdh/types';
import { CustomerDashboard } from '@/components/customers/customer-dashboard';
import { CustomersTable, CustomersMobileCards } from '@/components/customers/customers-table';
import { CustomerDrawer } from '@/components/customers/customer-drawer';

const FILTERS: { id: CustomerFilter; label: string }[] = [
  { id: 'all', label: 'All Customers' },
  { id: 'vip', label: 'VIP' },
  { id: 'regular', label: 'Regular' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'new', label: 'New' },
  { id: 'repeat', label: 'Repeat' },
  { id: 'birthday', label: 'Birthday Today' },
];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [mobileSelectedId, setMobileSelectedId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => api.get<CustomerDashboardDto>('/customers/dashboard'),
    staleTime: 30_000,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['customers-list', search, filter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filter !== 'all') params.set('filter', filter);
      params.set('limit', '100');
      return api.get<{ data: CustomerListItemDto[]; total: number }>(
        `/customers?${params.toString()}`,
      );
    },
  });

  const { data: mobileDetail } = useQuery({
    queryKey: ['customer-detail', mobileSelectedId],
    queryFn: () => api.get(`/customers/${mobileSelectedId}`),
    enabled: !!mobileSelectedId && mobileDrawerOpen,
  });

  const customers = listData?.data ?? [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['customers-list'] });
  };

  const exportCsv = () => {
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Orders', 'Spent', 'Points', 'Type', 'Status'];
    const rows = customers.map((c) =>
      [
        c.customerId,
        c.name,
        c.phone,
        c.email,
        c.totalOrders,
        c.totalSpent,
        c.rewardPoints,
        c.customerType,
        c.status,
      ].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-[#14532D]" />
            Customer Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {listData?.total ?? 0} customers · CRM & loyalty program
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      <CustomerDashboard data={dashboard} loading={dashLoading} />

      {/* Search & filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name, phone, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                filter === f.id
                  ? 'bg-[#14532D] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {listLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <CustomersTable customers={customers} onRefresh={refresh} />
          </div>
          <div className="md:hidden">
            <CustomersMobileCards
              customers={customers}
              onSelect={(id) => {
                setMobileSelectedId(id);
                setMobileDrawerOpen(true);
              }}
            />
          </div>
        </>
      )}

      {/* Mobile drawer */}
      <CustomerDrawer
        customer={mobileDetail ?? null}
        open={mobileDrawerOpen}
        onClose={() => {
          setMobileDrawerOpen(false);
          setMobileSelectedId(null);
        }}
        onRefresh={refresh}
      />
    </div>
  );
}
