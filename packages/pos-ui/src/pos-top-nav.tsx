'use client';

import { useEffect, useState } from 'react';
import { cn } from '@mdh/ui';
import type { PosMenuProductDto } from '@mdh/types';
import {
  Bell,
  LayoutGrid,
  LogOut,
  Moon,
  Printer,
  Settings,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { POS_THEME } from './pos-theme';
import { PosSearchAutocomplete } from './pos-search-autocomplete';

interface PosTopNavProps {
  cashierName?: string;
  shiftLabel?: string;
  offlineQueueCount?: number;
  darkMode: boolean;
  onToggleDark: () => void;
  liveTime: Date | null;
  search: string;
  onSearchChange: (v: string) => void;
  allProducts: PosMenuProductDto[];
  recentProductIds: string[];
  topProductIds: string[];
  onSearchSelect: (product: PosMenuProductDto) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  online?: boolean;
  onOpenSettings?: () => void;
  onOpenLauncher?: () => void;
  onOpenLogout?: () => void;
}

export function PosTopNav({
  cashierName,
  shiftLabel = 'Active',
  offlineQueueCount = 0,
  darkMode,
  onToggleDark,
  liveTime,
  search,
  onSearchChange,
  allProducts,
  recentProductIds,
  topProductIds,
  onSearchSelect,
  searchInputRef,
  online = true,
  onOpenSettings,
  onOpenLauncher,
  onOpenLogout,
}: PosTopNavProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const timeStr =
    mounted && liveTime
      ? liveTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '--:--';
  const dateStr =
    mounted && liveTime
      ? liveTime.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : '---';
  const cashierLabel = mounted ? (cashierName ?? 'Staff') : 'Staff';

  return (
    <header
      className={cn(
        'shrink-0 z-50 border-b backdrop-blur-xl',
        darkMode
          ? 'bg-gray-900/95 border-gray-800 text-white'
          : 'bg-white/95 border-gray-200 text-gray-900',
      )}
      style={{ boxShadow: POS_THEME.shadow }}
    >
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Logo + brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: POS_THEME.primary }}
          >
            MDH
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-sm leading-tight" style={{ color: POS_THEME.primary }}>
              Mercy Dosa House
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">● Open · Main Branch</p>
          </div>
        </div>

        {/* Global search — autocomplete dropdown; menu grid stays unchanged */}
        <div className="flex-1 max-w-lg mx-2 min-w-0">
          <PosSearchAutocomplete
            search={search}
            onSearchChange={onSearchChange}
            products={allProducts}
            recentProductIds={recentProductIds}
            topProductIds={topProductIds}
            onSelect={onSearchSelect}
            darkMode={darkMode}
            inputRef={searchInputRef}
          />
        </div>

        {/* Meta chips */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <MetaChip label="Cashier" value={cashierLabel} dark={darkMode} />
          <MetaChip label="Shift" value={shiftLabel} dark={darkMode} />
          <MetaChip label={dateStr} value={timeStr} dark={darkMode} accent />
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <StatusPill
            icon={online ? Wifi : WifiOff}
            label={
              offlineQueueCount > 0
                ? `Offline (${offlineQueueCount})`
                : online
                  ? 'Online'
                  : 'Offline'
            }
            ok={online && offlineQueueCount === 0}
          />
          <StatusPill icon={Printer} label="Printer Ready" ok />
          <IconBtn onClick={onToggleDark} dark={darkMode}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconBtn>
          <IconBtn dark={darkMode}>
            <Bell className="h-4 w-4" />
          </IconBtn>
          <IconBtn dark={darkMode} onClick={onOpenLauncher} title="Applications (Ctrl+Alt+A)">
            <LayoutGrid className="h-4 w-4" />
          </IconBtn>
          <IconBtn dark={darkMode} onClick={onOpenSettings} title="Settings (F1)">
            <Settings className="h-4 w-4" />
          </IconBtn>
          <IconBtn dark={darkMode} onClick={onOpenLogout} title="Logout (Ctrl+Shift+L)">
            <LogOut className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
    </header>
  );
}

function MetaChip({
  label,
  value,
  dark,
  accent,
}: {
  label: string;
  value: string;
  dark: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'px-2.5 py-1 rounded-lg border',
        dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
      )}
    >
      <p className="text-[9px] uppercase tracking-wider text-gray-400">{label}</p>
      <p
        className={cn('font-semibold', accent && 'text-emerald-600')}
        style={accent ? {} : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  ok,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ok: boolean;
}) {
  return (
    <span
      className={cn(
        'hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold',
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  dark,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  dark: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'p-2 rounded-xl transition hover:scale-105 active:scale-95',
        dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600',
      )}
    >
      {children}
    </button>
  );
}
