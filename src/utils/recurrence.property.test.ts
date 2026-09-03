import { addDays, addMonths, addYears } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { expandRecurring } from './recurrence';
import { fromISODate, toISODate } from './dateHelpers';
import type { CalendarEvent, RecurrenceFrequency } from '../types';

/**
 * Independent reference: identical anchoring, but walks from occurrence 0 every
 * time instead of seeking. Any disagreement is a bug in the seek arithmetic —
 * which is the part that can silently drop occurrences rather than fail loudly.
 */
function referenceExpand(ev: CalendarEvent, rangeStart: string, rangeEnd: string): string[] {
  const out: string[] = [];
  if (!ev.recurrence) {
    if (ev.date >= rangeStart && ev.date <= rangeEnd) out.push(ev.date);
    return out;
  }
  const anchor = fromISODate(ev.date);
  for (let i = 0; i < 200_000; i++) {
    let d: Date;
    switch (ev.recurrence) {
      case 'daily': d = addDays(anchor, i); break;
      case 'weekly': d = addDays(anchor, i * 7); break;
      case 'monthly': d = addMonths(anchor, i); break;
      case 'yearly': d = addYears(anchor, i); break;
    }
    const iso = toISODate(d);
    if (iso > rangeEnd) break;
    if (ev.recurrenceEnd && iso > ev.recurrenceEnd) break;
    if (iso >= rangeStart) out.push(iso);
  }
  return out;
}

const FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

// Deliberately loaded with month-end, leap-day and year-boundary anchors.
const ANCHORS = [
  '1990-01-01', '1999-12-31', '2000-02-29', '2004-02-29', '2019-01-29',
  '2020-01-30', '2020-01-31', '2021-02-28', '2023-03-31', '2024-02-29',
  '2024-04-30', '2024-08-31', '2025-05-31', '2025-11-30', '2026-01-31',
  '2026-02-28', '2026-06-15', '2026-07-04', '2026-09-01', '2026-12-31',
];

const RANGES: [string, string][] = [
  ['2026-01-01', '2026-01-31'], ['2026-02-01', '2026-02-28'], ['2026-03-01', '2026-03-31'],
  ['2026-04-01', '2026-04-30'], ['2024-02-01', '2024-02-29'], ['2026-12-01', '2026-12-31'],
  ['2027-01-01', '2027-01-31'], ['2026-06-15', '2026-06-15'], ['2026-05-31', '2026-06-01'],
  ['2026-01-01', '2026-12-31'], ['2025-12-28', '2026-01-04'], ['2030-03-01', '2030-03-31'],
  ['2026-02-28', '2026-03-01'], ['2028-02-01', '2028-02-29'], ['2026-10-31', '2026-11-01'],
];

const base = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x', title: 'x', date: '2026-01-01', allDay: true, category: 'work', pinned: false, ...over,
});

describe('expandRecurring matches a walk-from-start reference', () => {
  it('agrees on every frequency x anchor x range combination', () => {
    const mismatches: string[] = [];
    let compared = 0;

    for (const recurrence of FREQUENCIES) {
      for (const date of ANCHORS) {
        for (const [start, end] of RANGES) {
          const ev = base({ date, recurrence });
          const actual = expandRecurring([ev], start, end).map((e) => e.date);
          const expected = referenceExpand(ev, start, end);
          compared++;
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            mismatches.push(
              `${recurrence} anchored ${date} over ${start}..${end}\n` +
              `    expected ${JSON.stringify(expected)}\n    actual   ${JSON.stringify(actual)}`,
            );
          }
        }
      }
    }

    expect(compared).toBe(FREQUENCIES.length * ANCHORS.length * RANGES.length);
    expect(mismatches.join('\n')).toBe('');
  });

  it('agrees when a recurrenceEnd truncates the series', () => {
    const mismatches: string[] = [];
    for (const recurrence of FREQUENCIES) {
      for (const date of ANCHORS.slice(0, 10)) {
        for (const recurrenceEnd of ['2026-02-14', '2026-06-30', '2027-01-01']) {
          for (const [start, end] of RANGES.slice(0, 8)) {
            const ev = base({ date, recurrence, recurrenceEnd });
            const actual = expandRecurring([ev], start, end).map((e) => e.date);
            const expected = referenceExpand(ev, start, end);
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
              mismatches.push(`${recurrence} ${date} until ${recurrenceEnd} over ${start}..${end}`);
            }
          }
        }
      }
    }
    expect(mismatches.join('\n')).toBe('');
  });

  it('never emits a date outside the requested range', () => {
    for (const recurrence of FREQUENCIES) {
      for (const date of ANCHORS) {
        for (const [start, end] of RANGES) {
          for (const occurrence of expandRecurring([base({ date, recurrence })], start, end)) {
            expect(occurrence.date >= start && occurrence.date <= end).toBe(true);
          }
        }
      }
    }
  });

  it('emits strictly ascending dates with no duplicates', () => {
    for (const recurrence of FREQUENCIES) {
      for (const date of ANCHORS) {
        const out = expandRecurring([base({ date, recurrence })], '2026-01-01', '2026-12-31')
          .map((e) => e.date);
        for (let i = 1; i < out.length; i++) expect(out[i] > out[i - 1]).toBe(true);
      }
    }
  });
});
