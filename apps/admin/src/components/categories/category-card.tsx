'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@mdh/utils';
import type { AdminCategoryDto } from '@mdh/types';
import { Badge, Button, cn } from '@mdh/ui';
import { CategoryStatusBadge, CategoryBadgePill } from './category-badges';
import { Edit, Eye, Copy, Trash2, BarChart3, GripVertical, Star } from 'lucide-react';

const CATEGORY_ICONS: Record<string, string> = {
  dosa: '🍽',
  idly: '🥘',
  vada: '🍩',
  biryani: '🍛',
  beverages: '🥤',
  meals: '🍱',
  combos: '🎁',
};

interface CategoryCardProps {
  category: AdminCategoryDto;
  onEdit?: (id: string) => void;
  onPreview?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function CategoryCard({
  category,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  selected,
  onSelect,
}: CategoryCardProps) {
  const icon = category.icon ?? CATEGORY_ICONS[category.slug] ?? '🍽';
  const scheduleLabel = category.schedules[0]
    ? `${category.schedules[0].label} • ${
        category.schedules
          .slice(1)
          .map((s) => s.label)
          .join(' • ') || ''
      }`.replace(/ • $/, '')
    : 'All day';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      draggable={draggable}
      onDragStart={() => onDragStart?.(category.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop?.(category.id)}
      className={cn(
        'group relative rounded-2xl border bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-md hover:shadow-xl transition-all overflow-hidden',
        selected && 'ring-2 ring-[#14532D]',
      )}
      style={{
        background: category.backgroundColor
          ? `linear-gradient(135deg, ${category.backgroundColor}15, white)`
          : undefined,
      }}
    >
      {category.bannerUrl ? (
        <div
          className="h-24 bg-cover bg-center"
          style={{ backgroundImage: `url(${category.bannerUrl})` }}
        />
      ) : (
        <div className="h-24 bg-gradient-to-br from-[#14532D]/20 via-emerald-100/50 to-teal-50 dark:from-[#14532D]/40 dark:to-gray-800 flex items-center justify-center text-4xl">
          {icon}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(category.id)}
                className="rounded border-gray-300"
              />
            )}
            {draggable && (
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-lg truncate flex items-center gap-1.5">
                <span>{icon}</span>
                {category.name.toUpperCase()}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">{category.slug}</p>
            </div>
          </div>
          <CategoryStatusBadge status={category.status} />
        </div>

        {category.badge && <CategoryBadgePill badge={category.badge} className="mt-2" />}

        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
          <Stat label="Items" value={String(category.itemCount)} />
          <Stat label="Revenue" value={formatCurrency(category.analytics.revenue)} />
          <Stat label="Display Order" value={String(category.sortOrder)} />
          <Stat label="Available" value={`${category.availableItems}/${category.itemCount}`} />
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 truncate">{scheduleLabel}</p>

        {category.isPopular && (
          <div className="flex items-center gap-0.5 mt-2 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
          </div>
        )}

        {/* Mini chart sparkline */}
        <div className="flex items-end gap-0.5 h-8 mt-3">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-[#14532D]/30 group-hover:bg-[#14532D]/60 transition-colors"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionBtn icon={Edit} label="Edit" onClick={() => onEdit?.(category.id)} />
          <ActionBtn icon={Eye} label="View" onClick={() => onPreview?.(category.id)} />
          <ActionBtn icon={Copy} label="Copy" onClick={() => onDuplicate?.(category.id)} />
          <ActionBtn icon={BarChart3} label="Stats" onClick={() => onPreview?.(category.id)} />
          <ActionBtn icon={Trash2} label="Delete" onClick={() => onDelete?.(category.id)} danger />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <p className="text-[9px] uppercase text-muted-foreground font-semibold">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn('h-7 px-2 text-[10px]', danger && 'text-red-500 hover:text-red-600')}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-3 w-3" />
    </Button>
  );
}
