'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { ActivityInsightDto } from '@mdh/types';

const TYPE_STYLES: Record<string, string> = {
  info: 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200',
  warning: 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200',
  critical: 'bg-red-50/80 dark:bg-red-950/20 border-red-200',
  success: 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200',
};

export function ActivityInsightsPanel({
  insights,
  loading,
}: {
  insights?: ActivityInsightDto[];
  loading?: boolean;
}) {
  if (loading) return <div className="h-40 rounded-2xl bg-muted animate-pulse" />;
  if (!insights?.length) return null;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-[#14532D]/5 to-emerald-50/50 dark:from-[#14532D]/10 dark:to-gray-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-[#14532D]" />
        <h3 className="font-semibold">AI Audit Insights</h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'rounded-xl border p-3 text-sm backdrop-blur',
              TYPE_STYLES[insight.type] ?? TYPE_STYLES.info,
            )}
          >
            {insight.message}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
