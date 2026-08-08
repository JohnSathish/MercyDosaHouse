import { create } from 'zustand';

interface UiState {
  drawerOpen: boolean;
  cartOpen: boolean;
  searchOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  drawerOpen: false,
  cartOpen: false,
  searchOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setCartOpen: (open) => set({ cartOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
}));
