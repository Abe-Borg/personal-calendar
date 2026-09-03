import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns';
import type { CalendarEvent, RecurrenceFrequency } from '../types';
import { fromISODate, toISODate } from './dateHelpers';

/**
 * Cap on occurrences emitted *per event per range*. The expander seeks straight
 * to the range, so this bounds output rather than the walk — a month can hold at
 * most 31 daily occurrences.
 */
const MAX_OCCURRENCES_PER_RANGE = 1000;

/**
 * Occurrence `i` is always derived from the original anchor, never from the
 * previously emitted date. Stepping off the previous date lets a clamped month
 * (Jan 31 -> Feb 28) drag the whole series backwards permanently.
 */
function occurrenceAt(anchor: Date, freq: RecurrenceFrequency, i: number): Date {
  switch (freq) {
    case 'daily': return addDays(anchor, i);
    case 'weekly': return addDays(anchor, i * 7);
    case 'monthly': return addMonths(anchor, i);
    case 'yearly': return addYears(anchor, i);
  }
}

function approxIndexAt(anchor: Date, freq: RecurrenceFrequency, target: Date): number {
  switch (freq) {
    case 'daily': return differenceInCalendarDays(target, anchor);
    case 'weekly': return Math.ceil(differenceInCalendarDays(target, anchor) / 7);
    case 'monthly': return differenceInCalendarMonths(target, anchor);
    case 'yearly': return differenceInCalendarYears(target, anchor);
  }
}

export function expandRecurring(
  events: CalendarEvent[],
  rangeStart: string,
  rangeEnd: string,
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  if (rangeEnd < rangeStart) return out;
  const rangeStartDate = fromISODate(rangeStart);

  for (const ev of events) {
    if (!ev.recurrence) {
      if (ev.date >= rangeStart && ev.date <= rangeEnd) out.push(ev);
      continue;
    }

    const anchor = fromISODate(ev.date);
    if (Number.isNaN(anchor.getTime())) continue;
    const seriesEnd = ev.recurrenceEnd ?? null;

    // Seek to the range instead of walking from the series start. Calendar-diff
    // rounding can land one step early, so back off by one and let the loop filter.
    let i = Math.max(0, approxIndexAt(anchor, ev.recurrence, rangeStartDate) - 1);

    for (let emitted = 0; emitted < MAX_OCCURRENCES_PER_RANGE; i++) {
      const iso = toISODate(occurrenceAt(anchor, ev.recurrence, i));
      if (iso > rangeEnd) break;
      if (seriesEnd && iso > seriesEnd) break;
      if (iso >= rangeStart) {
        out.push({ ...ev, date: iso });
        emitted++;
      }
    }
  }
  return out;
}
