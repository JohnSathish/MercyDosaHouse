'use client';

import { Button } from '@mdh/ui';

interface CmsPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function CmsPageHeader({ title, description, action }: CmsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-4 sm:mb-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#14532D] break-words">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed break-words">{description}</p>
          )}
        </div>
        {action && (
          <Button
            className="bg-[#14532D] hover:bg-[#14532D]/90 shrink-0 w-full sm:w-auto min-h-[44px]"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
