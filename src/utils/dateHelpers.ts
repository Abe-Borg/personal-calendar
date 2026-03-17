import { endOfMonth, format, startOfMonth } from 'date-fns';

export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');
export const monthRange = (year: number, month: number) => ({
  start: format(startOfMonth(new Date(year, month, 1)), 'yyyy-MM-dd'),
  end: format(endOfMonth(new Date(year, month, 1)), 'yyyy-MM-dd'),
});
