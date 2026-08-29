const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const CHICKEN_BIRYANI_SLUG = 'chicken-biryani';
export const CHICKEN_BIRYANI_TIME_SLOT = '1:00 PM - 2:00 PM';
export const CHICKEN_BIRYANI_VALIDATION_MESSAGE =
  'Chicken Dum Biryani is available only on Sundays between 1:00 PM and 2:00 PM.';

export function isChickenDumBiryaniProduct(product: {
  slug?: string | null;
  name?: string | null;
}): boolean {
  const slug = product.slug?.trim().toLowerCase();
  if (slug === CHICKEN_BIRYANI_SLUG) return true;
  const name = product.name?.trim().toLowerCase() ?? '';
  return name.includes('chicken') && name.includes('biryani');
}

export interface PreOrderConfig {
  minDaysAhead?: number;
}

export const DEFAULT_PRE_ORDER_CONFIG: Required<PreOrderConfig> = { minDaysAhead: 1 };

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

/** Returns the next seven Sundays, excluding today when today is Sunday. */
export function getChickenBiryaniScheduleOptions(
  count = 7,
  now = new Date(),
): ScheduleDateOption[] {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday ?? '');
  const daysUntilSunday = weekday === 0 ? 7 : 7 - Math.max(0, weekday);
  const todayKey = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(todayKey + (daysUntilSunday + index * 7) * 86_400_000);
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
    const [weekdayLabel, ...dateParts] = label.replace(',', '').split(' ');
    return {
      value,
      label: `${weekdayLabel} · ${dateParts.join(' ')}`,
      qualifiesForPreOrder: true,
    };
  });
}

export function isChickenBiryaniScheduleMatch(
  scheduledDeliveryAt: Date | string | null | undefined,
): boolean {
  if (!scheduledDeliveryAt) return false;
  const date = new Date(scheduledDeliveryAt);
  if (Number.isNaN(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return (
    values.weekday === 'Sun' &&
    values.hour === '13' &&
    values.minute === '00' &&
    values.second === '00'
  );
}
