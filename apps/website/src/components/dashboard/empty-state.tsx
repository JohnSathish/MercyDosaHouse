'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@mdh/ui';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-12 px-6 bg-[#FFF8E8]/50 rounded-2xl border border-dashed border-primary/20"
    >
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-lg font-bold text-[#14532D] mb-2">{title}</h3>
      <p className="text-gray-500 text-sm max-w-sm mb-6">{description}</p>
      {onAction ? (
        <Button className="btn-glow bg-primary font-semibold" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : (
        <Link href={actionHref || '#'}>
          <Button className="btn-glow bg-primary font-semibold">{actionLabel}</Button>
        </Link>
      )}
    </motion.div>
  );
}
