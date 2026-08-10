'use client';

import { ReportsNav } from './reports-nav';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <ReportsNav />
      {children}
    </div>
  );
}
