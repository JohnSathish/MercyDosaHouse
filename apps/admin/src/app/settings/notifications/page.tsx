'use client';

import { Card, CardContent } from '@mdh/ui';
import { OrderNotificationEmailsPanel } from '@/components/settings/order-notification-emails-panel';

export default function SettingsNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage who receives alerts when customers place orders.
        </p>
      </div>

      <Card className="dark:bg-gray-900">
        <CardContent className="p-4 sm:p-6">
          <OrderNotificationEmailsPanel />
        </CardContent>
      </Card>
    </div>
  );
}
