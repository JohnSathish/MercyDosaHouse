'use client';

import { ActivityNav } from './activity-nav';

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <ActivityNav />
      {children}
    </div>
  );
}
