import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message });
    setTimeout(() => set({ message: null }), 3500);
  },
  clear: () => set({ message: null }),
}));
