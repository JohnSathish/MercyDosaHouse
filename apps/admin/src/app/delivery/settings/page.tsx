'use client';

import { Settings, Bell, MapPin, Zap } from 'lucide-react';
import { Badge } from '@mdh/ui';

const SETTINGS = [
  {
    icon: Zap,
    title: 'Auto Assignment',
    description:
      'Automatically assign orders to nearest available executive with lowest active orders.',
    enabled: true,
  },
  {
    icon: Bell,
    title: 'Customer Notifications',
    description: 'Send SMS, WhatsApp, and push notifications for order status updates.',
    enabled: true,
  },
  {
    icon: MapPin,
    title: 'Route Optimization',
    description: 'Optimize multi-order routes for minimum distance and time.',
    enabled: false,
  },
];

export default function DeliverySettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#14532D]" />
          Delivery Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure delivery workflow, notifications, and integrations
        </p>
      </div>

      <div className="space-y-3">
        {SETTINGS.map(({ icon: Icon, title, description, enabled }) => (
          <div
            key={title}
            className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm flex items-start gap-4"
          >
            <div className="h-10 w-10 rounded-lg bg-[#14532D]/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-[#14532D]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{title}</h3>
                <Badge
                  variant={enabled ? 'default' : 'outline'}
                  className={enabled ? 'bg-emerald-600 text-[10px]' : 'text-[10px]'}
                >
                  {enabled ? 'Enabled' : 'Coming soon'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="font-semibold mb-3">Integrations</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            'Google Maps API',
            'Google Distance Matrix',
            'Google Directions',
            'Twilio SMS',
            'WhatsApp Business',
            'Firebase Push',
            'Socket.IO Realtime',
          ].map((name) => (
            <div
              key={name}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <span>{name}</span>
              <Badge variant="outline" className="text-[10px]">
                {name.includes('Google') || name.includes('Socket') ? 'Ready' : 'Configure'}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
