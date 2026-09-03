import { describe, it, expect } from 'vitest';
import { addDays, addMonths, addYears } from 'date-fns';
import { expandRecurring } from './recurrence';
import { fromISODate, toISODate } from './dateHelpers';
import type { CalendarEvent, RecurrenceFrequency } from '../types';

function reference(ev: CalendarEvent, rangeStart: string, rangeEnd: string): string[] {
  const anchor = fromISODate(ev.date);
  const out: string[] = [];
  for (let i = 0; i < 200000; i++) {
    const d =
      ev.recurrence === 'daily' ? addDays(anchor, i)
      : ev.recurrence === 'weekly' ? addDays(anchor, i * 7)
      : ev.recurrence === 'monthly' ? addMonths(anchor, i)
      : addYears(anchor, i);
    const iso = toISODate(d);
    if (iso > rangeEnd) break;
    if (ev.recurrenceEnd && iso > ev.recurrenceEnd) break;
    if (iso >= rangeStart) out.push(iso);
  }
  return out;
}

const freqs: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

describe('brute force seek', () => {
  it('matches reference for many anchors/ranges', () => {
    const mismatches: string[] = [];
    const anchors: string[] = [];
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 2, 15, 28, 29, 30, 31]) {
        const iso = `2024-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!Number.isNaN(fromISODate(iso).getTime()) && toISODate(fromISODate(iso)) === iso) anchors.push(iso);
      }
    }
    anchors.push('2020-02-29', '2019-12-31', '2023-01-31', '2016-02-29');

    for (const anchor of anchors) {
      for (const freq of freqs) {
        // ranges: every month of 2024-2027, plus single days
        for (let y = 2023; y <= 2028; y++) {
          for (let m = 0; m < 12; m++) {
            const start = toISODate(new Date(y, m, 1));
            const end = toISODate(new Date(y, m + 1, 0));
            const ev = { id: 'x', title: 't', date: anchor, allDay: true, category: 'work', pinned: false, recurrence: freq } as CalendarEvent;
            const got = expandRecurring([ev], start, end).map((e) => e.date);
            const want = reference(ev, start, end);
            if (JSON.stringify(got) !== JSON.stringify(want)) {
              mismatches.push(`${freq} anchor=${anchor} range=${start}..${end} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
            }
          }
        }
      }
    }
    if (mismatches.length) console.log(mismatches.slice(0, 20).join('\n'), '\ntotal', mismatches.length);
    expect(mismatches).toEqual([]);
  });

  it('single-day ranges', () => {
    const mismatches: string[] = [];
    const anchors = ['2024-01-31', '2024-02-29', '2024-03-31', '2023-12-31', '2024-01-01', '2024-05-30'];
    for (const anchor of anchors) {
      for (const freq of freqs) {
        for (let k = 0; k < 800; k++) {
          const day = toISODate(addDays(fromISODate('2023-06-01'), k));
          const ev = { id: 'x', title: 't', date: anchor, allDay: true, category: 'work', pinned: false, recurrence: freq } as CalendarEvent;
          const got = expandRecurring([ev], day, day).map((e) => e.date);
          const want = reference(ev, day, day);
          if (JSON.stringify(got) !== JSON.stringify(want)) mismatches.push(`${freq} ${anchor} ${day} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
        }
      }
    }
    if (mismatches.length) console.log(mismatches.slice(0, 20).join('\n'), '\ntotal', mismatches.length);
    expect(mismatches).toEqual([]);
  });
});
