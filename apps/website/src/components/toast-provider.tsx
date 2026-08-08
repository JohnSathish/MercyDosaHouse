'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/lib/toast-store';

export function ToastProvider() {
  const message = useToastStore((s) => s.message);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#14532D] text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-medium"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
