'use client';

import type { AdminCategoryDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategoryStatusBadge, CategoryBadgePill } from './category-badges';
import { Badge } from '@mdh/ui';

interface CategoryPreviewDialogProps {
  category?: AdminCategoryDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryPreviewDialog({
  category,
  open,
  onOpenChange,
}: CategoryPreviewDialogProps) {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Preview</DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl border overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-[#14532D] to-emerald-700 flex items-center justify-center text-5xl">
            {category.icon ?? '🍽'}
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{category.name}</h2>
              <CategoryStatusBadge status={category.status} />
            </div>
            {category.badge && <CategoryBadgePill badge={category.badge} />}
            <p className="text-sm text-muted-foreground">
              {category.description ?? 'No description'}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted p-2">
                <p className="font-bold text-lg">{category.itemCount}</p>
                <p className="text-muted-foreground">Items</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="font-bold text-lg">{category.prepTimeMinutes}m</p>
                <p className="text-muted-foreground">Prep Time</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="font-bold text-lg">{formatCurrency(category.analytics.revenue)}</p>
                <p className="text-muted-foreground">Revenue</p>
              </div>
            </div>
            {category.schedules.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Available Timings</p>
                {category.schedules.map((s) => (
                  <Badge key={s.label} variant="outline" className="text-[10px] mr-1">
                    {s.label}: {s.startTime}–{s.endTime}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground italic">
              This is how customers see this category on the website and mobile app.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
