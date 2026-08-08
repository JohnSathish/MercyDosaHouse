'use client';

import { Shield } from 'lucide-react';
import { ModulePlaceholder } from '@/components/module-placeholder';

export default function RolesPage() {
  return (
    <ModulePlaceholder
      title="Roles & Permissions"
      description="Manage staff roles with granular permissions for every module."
      icon={Shield}
      features={[
        'Super Admin, Restaurant Admin, Cashier roles',
        'Kitchen Staff & Delivery permissions',
        'Marketing & Content Editor access',
        'Per-module read/write controls',
        'Staff invitation & onboarding',
        'Session & login audit',
      ]}
    />
  );
}
