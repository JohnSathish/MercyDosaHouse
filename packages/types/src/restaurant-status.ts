/** Future-ready weekly / holiday schedule (not auto-evaluated yet). */
export interface OperatingScheduleDto {
  timezone?: string;
  weekly?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  holidays?: { date: string; closed: boolean; reason?: string }[];
}

export interface RestaurantStatusDto {
  storeOpen: boolean;
  storeClosedMessage: string | null;
  storeReopenMessage: string | null;
  storeClosedReason: string | null;
  storeStatusChangedAt: string | null;
  storeStatusChangedByName: string | null;
  openingHours: string | null;
  /** Reserved for scheduled hours automation */
  operatingSchedule: OperatingScheduleDto | null;
}

export const DEFAULT_STORE_CLOSED_MESSAGE =
  'Mercy Dosa House is currently closed and is not accepting orders. Please try again when we reopen.';

export const DEFAULT_STORE_CLOSED_CUSTOMER_HEADLINE = "We're Currently Closed";

export const DEFAULT_STORE_CLOSED_CUSTOMER_BODY =
  "We're not accepting new orders right now. Please check back during our opening hours.";
