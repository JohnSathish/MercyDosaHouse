const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export interface PreOrderConfig {
  discountPct?: number;
  minDaysAhead?: number;
  stackWithCoupons?: boolean;
}

export const DEFAULT_PRE_ORDER_CONFIG: Required<PreOrderConfig> = {
  discountPct: 10,
  minDaysAhead: 1,
  stackWithCoupons: false,
};

/** YYYY-MM-DD in the given timezone */
export function toCalendarDayKey(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Whole calendar days between two instants (delivery day − order day) */
export function calendarDaysAhead(
  scheduledDeliveryAt: Date | string,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): number {
  const scheduled = new Date(scheduledDeliveryAt);
  if (Number.isNaN(scheduled.getTime())) return 0;
  const fromKey = toCalendarDayKey(now, timeZone);
  const toKey = toCalendarDayKey(scheduled, timeZone);
  const fromMs = Date.parse(`${fromKey}T00:00:00Z`);
  const toMs = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

export function isPreOrderEligible(
  scheduledDeliveryAt: Date | string | null | undefined,
  now = new Date(),
  config: PreOrderConfig = {},
): boolean {
  if (!scheduledDeliveryAt) return false;
  const { minDaysAhead } = { ...DEFAULT_PRE_ORDER_CONFIG, ...config };
  return calendarDaysAhead(scheduledDeliveryAt, now) >= minDaysAhead;
}

/** 10% (or configured %) off food subtotal only */
export function calculatePreOrderDiscount(
  subtotal: number,
  scheduledDeliveryAt: Date | string | null | undefined,
  config: PreOrderConfig = {},
): number {
  if (!isPreOrderEligible(scheduledDeliveryAt, new Date(), config)) return 0;
  const { discountPct } = { ...DEFAULT_PRE_ORDER_CONFIG, ...config };
  return Math.max(0, Math.min(subtotal, Math.round((subtotal * discountPct) / 100)));
}

export function buildScheduledDeliveryIso(
  scheduledDate: string,
  scheduledSlot: string,
): string | undefined {
  if (!scheduledDate || !scheduledSlot) return undefined;
  const start = scheduledSlot.split(' - ')[0]?.trim();
  if (!start) return undefined;
  const [time, meridiem] = start.split(' ');
  if (!time || !meridiem) return undefined;
  let [h, m] = time.split(':').map(Number);
  if (meridiem === 'PM' && h < 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  const d = new Date(
    `${scheduledDate}T${String(h).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}:00+05:30`,
  );
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export interface ScheduleDateOption {
  value: string;
  label: string;
  qualifiesForPreOrder: boolean;
}

export function getScheduleDateOptions(
  count = 7,
  now = new Date(),
  config: PreOrderConfig = {},
): ScheduleDateOption[] {
  const { minDaysAhead } = { ...DEFAULT_PRE_ORDER_CONFIG, ...config };
  const weekday = new Intl.DateTimeFormat('en-IN', {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'short',
  });

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const value = toCalendarDayKey(d);
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday.format(d);
    const dateLabel = new Intl.DateTimeFormat('en-IN', {
      timeZone: DEFAULT_TIMEZONE,
      day: 'numeric',
      month: 'short',
    }).format(d);

    return {
      value,
      label: `${dayLabel} · ${dateLabel}`,
      qualifiesForPreOrder: i >= minDaysAhead,
    };
  });
}

export function firstPreOrderDate(options: ScheduleDateOption[]): string | null {
  return options.find((o) => o.qualifiesForPreOrder)?.value ?? null;
}
