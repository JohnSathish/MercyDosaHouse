'use client';

import { Megaphone } from 'lucide-react';
import { ModulePlaceholder } from '@/components/module-placeholder';

export default function MarketingPage() {
  return (
    <ModulePlaceholder
      title="Marketing Hub"
      description="Manage banners, popups, push notifications, WhatsApp campaigns, and email marketing."
      icon={Megaphone}
      features={[
        'Homepage banner management',
        'Popup & announcement campaigns',
        'Push notification broadcasts',
        'WhatsApp campaign templates',
        'Email marketing automation',
        'Review moderation & featured reviews',
      ]}
    />
  );
}
