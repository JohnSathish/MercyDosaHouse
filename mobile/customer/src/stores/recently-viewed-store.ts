import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  packingCharge?: number;
}

interface RecentlyViewedState {
  items: RecentlyViewedProduct[];
  record: (item: RecentlyViewedProduct) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],
      record: (item) => {
        const next = [item, ...get().items.filter((p) => p.id !== item.id)].slice(0, 8);
        set({ items: next });
      },
    }),
    {
      name: 'mdh-recently-viewed',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
