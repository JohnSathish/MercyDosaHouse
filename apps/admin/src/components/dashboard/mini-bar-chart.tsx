'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@mdh/ui';

interface MiniBarChartProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
}

export function MiniBarChart({ title, data, color = '#14532D' }: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="border-0 shadow-sm h-full w-full min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="w-full">
        <div className="flex items-end justify-between gap-2 sm:gap-3 h-40 sm:h-44 lg:h-48 w-full">
          {data.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">
                {d.value}
              </span>
              <div className="w-full flex items-end h-28 sm:h-32 lg:h-36">
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${(d.value / max) * 100}%`,
                    minHeight: d.value > 0 ? 8 : 4,
                    backgroundColor: color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
