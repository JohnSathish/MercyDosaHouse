'use client';

import { Button } from '@mdh/ui';

interface CmsPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function CmsPageHeader({ title, description, action }: CmsPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14532D]">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && (
        <Button className="bg-[#14532D] hover:bg-[#14532D]/90 shrink-0" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
