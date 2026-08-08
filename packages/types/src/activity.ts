export type ActivitySeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ActivityPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface ActivityLogDto {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  description?: string | null;
  severity: ActivitySeverity;
  status: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  device?: string | null;
  browser?: string | null;
  location?: string | null;
  sessionId?: string | null;
  durationMs?: number | null;
  createdAt: string;
  detail?: {
    requestUrl?: string | null;
    apiEndpoint?: string | null;
    relatedRecord?: string | null;
    macAddress?: string | null;
    os?: string | null;
    extra?: unknown;
  } | null;
}

export interface ActivityDashboardDto {
  stats: {
    todayActivities: number;
    criticalEvents: number;
    failedLogins: number;
    adminChanges: number;
    newOrders: number;
    menuUpdates: number;
    cmsChanges: number;
    usersOnline: number;
    lastUpdated: string;
  };
  recent: ActivityLogDto[];
  analytics: {
    byModule: { module: string; count: number }[];
    hourly: { hour: number; count: number }[];
  };
}

export interface ActivityLogsPageDto {
  data: ActivityLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginHistoryDto {
  id: string;
  userId?: string | null;
  email?: string | null;
  success: boolean;
  ipAddress?: string | null;
  device?: string | null;
  browser?: string | null;
  location?: string | null;
  failReason?: string | null;
  createdAt: string;
}

export interface UserSessionDto {
  id: string;
  userId: string;
  sessionId: string;
  ipAddress?: string | null;
  device?: string | null;
  browser?: string | null;
  location?: string | null;
  lastActiveAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface SecurityDashboardDto {
  failedLogins: number;
  blockedUsers: number;
  suspiciousIps: number;
  multipleDeviceLogins: number;
  passwordChanges: number;
  adminAccess: number;
  events: Array<{
    id: string;
    type: string;
    severity: ActivitySeverity;
    description: string;
    createdAt: string;
  }>;
}

export interface ActivityInsightDto {
  id: string;
  message: string;
  type: string;
}

export const ACTIVITY_MODULES = [
  'AUTH',
  'ORDERS',
  'KITCHEN',
  'DELIVERY',
  'INVENTORY',
  'MENU',
  'CMS',
  'CUSTOMERS',
  'REPORTS',
  'PAYMENTS',
  'COUPONS',
  'WEBSITE',
  'SEO',
  'MEDIA',
  'SETTINGS',
  'SECURITY',
  'API',
  'DATABASE',
  'SYSTEM',
] as const;
