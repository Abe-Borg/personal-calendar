import { describe, expect, it } from 'vitest';
import { expandRecurring } from './recurrence';
import type { CalendarEvent, RecurrenceFrequency } from '../types';

const ev = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1', title: 'Test', date: '2026-01-01', allDay: true,
  category: 'work', pinned: false, ...over,
});

const rec = (freq: RecurrenceFrequency, over: Partial<CalendarEvent> = {}) =>
  ev({ recurrence: freq, ...over });

const dates = (events: CalendarEvent[]) => events.map((e) => e.date);

describe('non-recurring events', () => {
  it('includes only those inside the range', () => {
    const list = [ev({ id: 'a', date: '2026-05-10' }), ev({ id: 'b', date: '2026-06-10' })];
    expect(dates(expandRecurring(list, '2026-05-01', '2026-05-31'))).toEqual(['2026-05-10']);
  });
  it('includes both range boundaries', () => {
    const list = [ev({ id: 'a', date: '2026-05-01' }), ev({ id: 'b', date: '2026-05-31' })];
    expect(dates(expandRecurring(list, '2026-05-01', '2026-05-31'))).toEqual(['2026-05-01', '2026-05-31']);
  });
});

describe('daily and weekly', () => {
  it('emits every day in range', () => {
    const out = dates(expandRecurring([rec('daily', { date: '2026-05-01' })], '2026-05-01', '2026-05-05'));
    expect(out).toEqual(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05']);
  });
  it('emits every 7th day, phase-locked to the anchor', () => {
    const out = dates(expandRecurring([rec('weekly', { date: '2026-05-04' })], '2026-05-01', '2026-05-31'));
    expect(out).toEqual(['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25']);
  });
  it('keeps weekly phase when the range starts mid-series', () => {
    const out = dates(expandRecurring([rec('weekly', { date: '2026-01-05' })], '2026-05-01', '2026-05-31'));
    expect(out).toEqual(['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25']);
  });
});

describe('monthly does not drift (regression)', () => {
  // Stepping off the previously clamped date walked a 31st series permanently
  // back to the 28th. Every occurrence is now derived from the anchor.
  it('returns to the 31st after a short month', () => {
    const out = dates(expandRecurring([rec('monthly', { date: '2026-01-31' })], '2026-01-01', '2026-06-30'));
    expect(out).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
  });
  it('emits exactly one occurrence per month for a full year', () => {
    const out = expandRecurring([rec('monthly', { date: '2026-01-31' })], '2026-01-01', '2026-12-31');
    expect(out).toHaveLength(12);
  });
  it('is unaffected for a mid-month anchor', () => {
    const out = dates(expandRecurring([rec('monthly', { date: '2026-01-15' })], '2026-01-01', '2026-04-30'));
    expect(out).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });
});

describe('yearly does not drift (regression)', () => {
  it('restores Feb 29 on the next leap year', () => {
    const out = dates(expandRecurring([rec('yearly', { date: '2024-02-29' })], '2024-01-01', '2028-12-31'));
    expect(out).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });
});

describe('long-running series (regression)', () => {
  // The old walk-from-start expander gave up after 5000 iterations, so a series
  // older than ~13.7 years rendered nothing at all.
  it('still renders a daily series anchored decades ago', () => {
    const out = dates(expandRecurring([rec('daily', { date: '1990-01-01' })], '2026-09-01', '2026-09-03'));
    expect(out).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });
  it('still renders a weekly series anchored decades ago', () => {
    const out = expandRecurring([rec('weekly', { date: '1990-01-01' })], '2026-09-01', '2026-09-30');
    expect(out).toHaveLength(4);
  });
  it('still renders a monthly series anchored decades ago', () => {
    const out = dates(expandRecurring([rec('monthly', { date: '1990-03-31' })], '2026-09-01', '2026-09-30'));
    expect(out).toEqual(['2026-09-30']);
  });
});

describe('recurrenceEnd', () => {
  it('stops the series at the end date inclusive', () => {
    const out = dates(expandRecurring(
      [rec('daily', { date: '2026-05-01', recurrenceEnd: '2026-05-03' })], '2026-05-01', '2026-05-31'));
    expect(out).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
  });
  it('emits nothing when the series ended before the range', () => {
    const out = expandRecurring(
      [rec('daily', { date: '2026-01-01', recurrenceEnd: '2026-01-31' })], '2026-05-01', '2026-05-31');
    expect(out).toEqual([]);
  });
});

describe('range handling', () => {
  it('emits nothing when the series starts after the range', () => {
    expect(expandRecurring([rec('daily', { date: '2027-01-01' })], '2026-05-01', '2026-05-31')).toEqual([]);
  });
  it('handles an inverted range without hanging', () => {
    expect(expandRecurring([rec('daily', { date: '2026-01-01' })], '2026-05-31', '2026-05-01')).toEqual([]);
  });
  it('handles a single-day range', () => {
    const out = dates(expandRecurring([rec('daily', { date: '2026-01-01' })], '2026-05-15', '2026-05-15'));
    expect(out).toEqual(['2026-05-15']);
  });
  it('ignores an event whose date is unparseable', () => {
    expect(expandRecurring([rec('daily', { date: 'not-a-date' })], '2026-05-01', '2026-05-31')).toEqual([]);
  });
});

describe('occurrence shape', () => {
  it('preserves the source row id and fields on every occurrence', () => {
    const out = expandRecurring(
      [rec('daily', { id: 'series-1', title: 'Standup', category: 'meeting', date: '2026-05-01' })],
      '2026-05-01', '2026-05-03');
    expect(out).toHaveLength(3);
    for (const o of out) {
      expect(o.id).toBe('series-1');
      expect(o.title).toBe('Standup');
      expect(o.category).toBe('meeting');
    }
  });
  it('does not mutate the source event', () => {
    const source = rec('daily', { date: '2026-05-01' });
    expandRecurring([source], '2026-05-10', '2026-05-12');
    expect(source.date).toBe('2026-05-01');
  });
});
