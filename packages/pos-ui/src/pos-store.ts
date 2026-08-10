'use client';

import { create } from 'zustand';
import type {
  PosBillDto,
  PosMenuCategoryDto,
  PosMenuProductDto,
  PosOrderType,
  PosTableDto,
  PosLiveAnalyticsDto,
} from '@mdh/types';

interface PosState {
  orderType: PosOrderType;
  bill: PosBillDto | null;
  menu: PosMenuCategoryDto[];
  tables: PosTableDto[];
  selectedCategoryId: string | null;
  search: string;
  analytics: PosLiveAnalyticsDto | null;
  recentProductIds: string[];
  showTables: boolean;
  darkMode: boolean;
  setOrderType: (t: PosOrderType) => void;
  setBill: (b: PosBillDto | null) => void;
  setMenu: (m: PosMenuCategoryDto[]) => void;
  setTables: (t: PosTableDto[]) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSearch: (s: string) => void;
  setAnalytics: (a: PosLiveAnalyticsDto | null) => void;
  addRecentProduct: (id: string) => void;
  setShowTables: (v: boolean) => void;
  toggleDarkMode: () => void;
}

export const usePosStore = create<PosState>((set, get) => ({
  orderType: 'DINE_IN',
  bill: null,
  menu: [],
  tables: [],
  selectedCategoryId: '__all__',
  search: '',
  analytics: null,
  recentProductIds: [],
  showTables: false,
  darkMode: false,
  setOrderType: (orderType) => set({ orderType }),
  setBill: (bill) => set({ bill }),
  setMenu: (menu) =>
    set({
      menu,
      selectedCategoryId: get().selectedCategoryId ?? '__all__',
    }),
  setTables: (tables) => set({ tables }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  setSearch: (search) => set({ search }),
  setAnalytics: (analytics) => set({ analytics }),
  addRecentProduct: (id) => {
    const cur = get().recentProductIds.filter((x) => x !== id);
    set({ recentProductIds: [id, ...cur].slice(0, 12) });
  },
  setShowTables: (showTables) => set({ showTables }),
  toggleDarkMode: () => set({ darkMode: !get().darkMode }),
}));

export function flattenProducts(menu: PosMenuCategoryDto[]): PosMenuProductDto[] {
  return menu.flatMap((c) => c.products);
}

export const POS_MODES: { value: PosOrderType; label: string }[] = [
  { value: 'DINE_IN', label: 'Dine-In' },
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'ONLINE_PICKUP', label: 'Online Pickup' },
  { value: 'STAFF_MEAL', label: 'Staff Meal' },
];

export const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-amber-500',
  RESERVED: 'bg-violet-500',
  CLEANING: 'bg-red-500',
  BILLING: 'bg-blue-500',
  WAITING: 'bg-orange-500',
};
