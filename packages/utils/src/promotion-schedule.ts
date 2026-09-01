const PROMOTION_TIMEZONE = 'Asia/Kolkata';
const DAY_MS = 86_400_000;

export interface PromotionSchedule {
  dayOfWeek: number;
  readyTime: string;
  preOrderRequired: boolean;
  preOrderCutoffDay?: number | null;
}

export interface NextPromotionDate {
  date: string;
  daysAhead: number;
  label: string;
}

export function promotionTimeParts(date: Date, timeZone = PROMOTION_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday ?? '');
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: weekday < 0 ? 0 : weekday,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function nextPromotionDate(
  schedule: Pick<PromotionSchedule, 'dayOfWeek' | 'preOrderRequired' | 'preOrderCutoffDay'>,
  now = new Date(),
): NextPromotionDate {
  const today = promotionTimeParts(now);
  const targetDay = Math.min(6, Math.max(0, Math.trunc(schedule.dayOfWeek)));
  const minimumDays = schedule.preOrderRequired ? 1 : 0;
  const cutoffDay =
    schedule.preOrderCutoffDay == null
      ? (targetDay + 6) % 7
      : Math.min(6, Math.max(0, Math.trunc(schedule.preOrderCutoffDay)));
  const cutoffOffset = (targetDay - cutoffDay + 7) % 7 || 7;
  const todayKey = Date.UTC(today.year, today.month - 1, today.day);

  for (let daysAhead = 0; daysAhead <= 14; daysAhead += 1) {
    const candidate = new Date(todayKey + daysAhead * DAY_MS);
    const cutoff = candidate.getTime() - cutoffOffset * DAY_MS;
    if (candidate.getUTCDay() !== targetDay || daysAhead < minimumDays || cutoff < todayKey) {
      continue;
    }
    const date = `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, '0')}-${String(candidate.getUTCDate()).padStart(2, '0')}`;
    const weekday = candidate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    return {
      date,
      daysAhead,
      label: daysAhead <= 6 ? `THIS ${weekday.toUpperCase()}` : `NEXT ${weekday.toUpperCase()}`,
    };
  }

  throw new Error('Could not calculate the next promotion date');
}

export function promotionTimeToMinutes(value: string | null | undefined): number | null {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : null;
}

export function formatPromotionTime(value: string | null | undefined): string {
  const minutes = promotionTimeToMinutes(value);
  if (minutes == null) return value || '';
  const hour = Math.floor(minutes / 60);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${suffix}`;
}

/** One-hour delivery window starting at the configured ready time (default 1:00 PM – 2:00 PM). */
export function promotionDeliverySlot(readyTime: string | null | undefined): string {
  const start = promotionTimeToMinutes(readyTime) ?? 13 * 60;
  const end = start + 60;
  const fmt = (total: number) => {
    const hour = Math.floor(total / 60) % 24;
    const minute = total % 60;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

export function isPromotionScheduleMatch(
  scheduledAt: Date | string,
  schedule: PromotionSchedule,
  now = new Date(),
): boolean {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return false;
  const parts = promotionTimeParts(date);
  const readyMinutes = promotionTimeToMinutes(schedule.readyTime);
  const scheduledMinutes = parts.hour * 60 + parts.minute;
  if (parts.weekday !== schedule.dayOfWeek) return false;
  if (readyMinutes != null && scheduledMinutes !== readyMinutes) return false;

  const current = promotionTimeParts(now);
  const currentKey = Date.UTC(current.year, current.month - 1, current.day);
  const scheduledKey = Date.UTC(parts.year, parts.month - 1, parts.day);
  const daysAhead = Math.round((scheduledKey - currentKey) / DAY_MS);
  const cutoffDay =
    schedule.preOrderCutoffDay == null
      ? (schedule.dayOfWeek + 6) % 7
      : Math.min(6, Math.max(0, Math.trunc(schedule.preOrderCutoffDay)));
  const cutoffOffset = (schedule.dayOfWeek - cutoffDay + 7) % 7 || 7;
  return (
    daysAhead >= (schedule.preOrderRequired ? 1 : 0) &&
    scheduledKey - cutoffOffset * DAY_MS >= currentKey
  );
}
