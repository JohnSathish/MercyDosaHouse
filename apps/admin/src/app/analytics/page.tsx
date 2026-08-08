'use client';

import { BarChart3 } from 'lucide-react';
import { ModulePlaceholder } from '@/components/module-placeholder';

export default function AnalyticsPage() {
  return (
    <ModulePlaceholder
      title="Analytics & Insights"
      description="Beautiful charts for sales trends, peak hours, top categories, and customer retention."
      icon={BarChart3}
      features={[
        'Today / Monthly / Yearly sales charts',
        'Top selling dosa & category breakdown',
        'Peak hours heatmap',
        'Returning customer rate',
        'Revenue vs orders comparison',
        'Exportable analytics reports',
      ]}
    />
  );
}
