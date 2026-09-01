'use client';

import { useNotificationsSocket } from '@/lib/use-notifications-inbox';

export function InboxRealtime() {
  useNotificationsSocket();
  return null;
}
