import { addDays, addMonths, addYears, parseISO } from 'date-fns';
import type { CalendarEvent } from '../types';
import { toISODate } from './dateHelpers';

const MAX_OCCURRENCES = 5000;

function step(date: Date, freq: NonNullable<CalendarEvent['recurrence']>): Date {
  switch (freq) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addDays(date, 7);
    case 'monthly': return addMonths(date, 1);
    case 'yearly': return addYears(date, 1);
  }
}

export function expandRecurring(events: CalendarEvent[], rangeStart: string, rangeEnd: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const ev of events) {
    if (!ev.recurrence) {
      if (ev.date >= rangeStart && ev.date <= rangeEnd) out.push(ev);
      continue;
    }
    const seriesEnd = ev.recurrenceEnd ?? null;
    let cur = parseISO(ev.date);
    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      const iso = toISODate(cur);
      if (iso > rangeEnd) break;
      if (seriesEnd && iso > seriesEnd) break;
      if (iso >= rangeStart) out.push({ ...ev, date: iso });
      cur = step(cur, ev.recurrence);
    }
  }
  return out;
}
