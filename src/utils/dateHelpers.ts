import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';

export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * `new Date('2026-10-15')` parses as UTC midnight, which formats back as the
 * *previous* day in any negative UTC offset. Always route date-only strings
 * through here.
 */
export const fromISODate = (iso: string) => parseISO(iso);

export const todayISO = () => toISODate(new Date());

export const monthRange = (year: number, month: number) => ({
  start: toISODate(startOfMonth(new Date(year, month, 1))),
  end: toISODate(endOfMonth(new Date(year, month, 1))),
});

export const isISODate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(parseISO(value).getTime());

export const isTimeString = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const minutesFromMidnight = (time: string | undefined, fallback = 0) => {
  if (!isTimeString(time)) return fallback;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
