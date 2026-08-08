'use client';

import { Navigation } from 'lucide-react';
import { ModulePlaceholder } from '@/components/module-placeholder';

export default function CmsNavigationPage() {
  return (
    <ModulePlaceholder
      title="Navigation Builder"
      description="Drag-and-drop header and footer navigation menus for the website."
      icon={Navigation}
      phase="Phase 1"
      features={[
        'Header menu links',
        'Footer link groups',
        'Drag & drop reordering',
        'Enable / disable items',
        'External link support',
        'Mobile menu preview',
      ]}
    />
  );
}
