'use client';

import { motion } from 'framer-motion';
import type { AdminCategoryDto, CategoryStatus } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { CategoryCard } from './category-card';

const COLUMNS: { status: CategoryStatus; label: string; color: string }[] = [
  { status: 'DRAFT', label: 'Draft', color: 'border-gray-300' },
  { status: 'PUBLISHED', label: 'Published', color: 'border-emerald-400' },
  { status: 'HIDDEN', label: 'Hidden', color: 'border-amber-400' },
  { status: 'INACTIVE', label: 'Inactive', color: 'border-red-400' },
  { status: 'SEASONAL', label: 'Seasonal', color: 'border-purple-400' },
];

interface CategoriesKanbanProps {
  categories: AdminCategoryDto[];
  onEdit?: (id: string) => void;
  onPreview?: (id: string) => void;
}

export function CategoriesKanban({ categories, onEdit, onPreview }: CategoriesKanbanProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = categories.filter((c) => c.status === col.status);
        return (
          <div
            key={col.status}
            className={`min-w-[280px] flex-1 rounded-2xl border-2 ${col.color} bg-muted/20 p-3`}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
                {items.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {items.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border bg-white dark:bg-gray-900 p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onEdit?.(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon ?? '🍽'}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.itemCount} items</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-[#14532D] mt-2">
                    {formatCurrency(cat.analytics.revenue)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
