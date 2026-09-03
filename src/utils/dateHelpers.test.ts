import { describe, expect, it } from 'vitest';
import {
  defaultNewEventDate, fromISODate, isISODate, isTimeString, minutesFromMidnight, monthRange, toISODate, todayISO,
} from './dateHelpers';

const SAMPLES = ['2026-01-01', '2026-03-08', '2026-06-15', '2026-10-15', '2026-11-01', '2026-12-31', '2024-02-29'];

describe('fromISODate / toISODate', () => {
  // The original defect: `new Date('2026-10-15')` is UTC midnight, which formats
  // back as 2026-10-14 anywhere west of Greenwich. This invariant must hold in
  // every timezone, so the suite is deliberately not pinned to one.
  it('round-trips every sample date unchanged', () => {
    for (const iso of SAMPLES) expect(toISODate(fromISODate(iso))).toBe(iso);
  });

  it('lands on local midnight, not UTC midnight', () => {
    const d = fromISODate('2026-10-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips across a DST spring-forward boundary', () => {
    for (const iso of ['2026-03-07', '2026-03-08', '2026-03-09', '2026-11-01', '2026-11-02']) {
      expect(toISODate(fromISODate(iso))).toBe(iso);
    }
  });
});

describe('isISODate', () => {
  it('accepts well-formed dates', () => {
    expect(isISODate('2026-10-15')).toBe(true);
    expect(isISODate('2024-02-29')).toBe(true);
  });
  it('rejects malformed or impossible values', () => {
    for (const bad of ['2026-13-01', '2026-02-30', '2026-1-5', 'yesterday', '', null, undefined, 42, {}]) {
      expect(isISODate(bad)).toBe(false);
    }
  });
});

describe('isTimeString', () => {
  it('accepts 24h times', () => {
    for (const t of ['00:00', '09:30', '13:45', '23:59']) expect(isTimeString(t)).toBe(true);
  });
  it('rejects everything else', () => {
    for (const t of ['24:00', '9:30', '12:60', '12', '', null, 930]) expect(isTimeString(t)).toBe(false);
  });
});

describe('minutesFromMidnight', () => {
  it('converts valid times', () => {
    expect(minutesFromMidnight('00:00')).toBe(0);
    expect(minutesFromMidnight('09:30')).toBe(570);
    expect(minutesFromMidnight('23:59')).toBe(1439);
  });
  it('falls back for invalid input rather than producing NaN', () => {
    expect(minutesFromMidnight(undefined)).toBe(0);
    expect(minutesFromMidnight('nope', 99)).toBe(99);
    expect(Number.isNaN(minutesFromMidnight('bad'))).toBe(false);
  });
});

describe('monthRange', () => {
  it('spans the whole month', () => {
    expect(monthRange(2026, 0)).toEqual({ start: '2026-01-01', end: '2026-01-31' });
    expect(monthRange(2026, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange(2024, 1)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange(2026, 11)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});

describe('defaultNewEventDate', () => {
  it('uses the selected day when there is one', () => {
    expect(defaultNewEventDate('2026-03-09', 2026, 11)).toBe('2026-03-09');
  });

  it('uses today when the current month is on screen', () => {
    const today = todayISO();
    const [y, m] = today.split('-').map(Number);
    expect(defaultNewEventDate(null, y, m - 1)).toBe(today);
  });

  it('uses the first of the month being browsed, not today', () => {
    // Seeding today here filed the event into a month the user was not viewing.
    expect(defaultNewEventDate(null, 2030, 6)).toBe('2030-07-01');
    expect(defaultNewEventDate(null, 1999, 0)).toBe('1999-01-01');
  });
});
