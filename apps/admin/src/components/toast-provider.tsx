'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/lib/toast-store';

export function ToastProvider() {
  const message = useToastStore((s) => s.message);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#14532D] text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
