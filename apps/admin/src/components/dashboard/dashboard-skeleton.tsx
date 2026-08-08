'use client';

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-28 rounded-2xl bg-[#14532D]/20" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3 lg:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
