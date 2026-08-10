'use client';

import { create } from 'zustand';

interface PosToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
  clear: () => void;
}

export const usePosToast = create<PosToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 3500);
  },
  clear: () => set({ message: null }),
}));

export function PosToastHost({ darkMode }: { darkMode: boolean }) {
  const { message, type } = usePosToast();
  if (!message) return null;
  const colors =
    type === 'error'
      ? 'bg-red-600 text-white'
      : type === 'success'
        ? 'bg-emerald-600 text-white'
        : darkMode
          ? 'bg-gray-800 text-white border border-gray-700'
          : 'bg-white text-gray-900 border border-gray-200 shadow-lg';
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[400] px-4 py-2.5 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
      <div className={colors + ' px-4 py-2.5 rounded-xl'}>{message}</div>
    </div>
  );
}

function posErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export { posErrorMessage };
