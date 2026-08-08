'use client';

import { useCmsContent } from '@/components/cms/cms-content-provider';

export function AnnouncementBar() {
  const cms = useCmsContent();
  const bar = cms?.announcements.find((a) => a.type === 'BAR' && a.isActive);

  if (!bar) return null;

  return (
    <div className="bg-[#14532D] text-white text-center text-sm py-2 px-4 shrink-0">
      {bar.linkUrl ? (
        <a href={bar.linkUrl} className="hover:underline font-medium">
          {bar.message}
        </a>
      ) : (
        <span className="font-medium">{bar.message}</span>
      )}
    </div>
  );
}
