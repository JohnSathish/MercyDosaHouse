'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { ReportInsightDto } from '@mdh/types';

export function InsightsPanel({
  insights,
  loading,
}: {
  insights?: ReportInsightDto[];
  loading?: boolean;
}) {
  if (loading) {
    return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;
  }

  if (!insights?.length) return null;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-[#14532D]/5 to-emerald-50/50 dark:from-[#14532D]/10 dark:to-gray-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-[#14532D]" />
        <h3 className="font-semibold">AI Business Insights</h3>
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
              insight.type === 'positive' &&
                'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200',
              insight.type === 'info' && 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200',
              insight.type === 'suggestion' &&
                'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200',
              insight.type === 'warning' && 'bg-red-50/80 dark:bg-red-950/20 border-red-200',
            )}
          >
            <p>{insight.message}</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">
              {insight.category}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
