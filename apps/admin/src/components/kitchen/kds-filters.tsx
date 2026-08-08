'use client';

import { cn } from '@mdh/ui';
import { Search } from 'lucide-react';
import type { KitchenStationDto, KitchenStatusFilter } from '@mdh/types';

const STATUS_TABS: { id: KitchenStatusFilter; label: string }[] = [
  { id: 'new', label: 'New Orders' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

interface KdsFiltersProps {
  status: KitchenStatusFilter;
  onStatusChange: (s: KitchenStatusFilter) => void;
  station: string;
  onStationChange: (s: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  stations: KitchenStationDto[];
}

export function KdsFilters({
  status,
  onStatusChange,
  station,
  onStationChange,
  search,
  onSearchChange,
  stations,
}: KdsFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusChange(tab.id)}
            className={cn(
              'min-h-11 px-4 rounded-xl text-sm font-semibold transition-colors',
              status === tab.id
                ? 'bg-[#14532D] text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="search"
            placeholder="Search order, customer, token…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#14532D]/50"
          />
        </div>

        <select
          value={station}
          onChange={(e) => onStationChange(e.target.value)}
          className="h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white min-w-[160px]"
        >
          <option value="all">All Stations</option>
          {stations.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
