import { describe, expect, it } from 'vitest';
import { computeEventLayouts } from './eventLayout';
import type { CalendarEvent } from '../types';

const ev = (id: string, startTime?: string, endTime?: string): CalendarEvent => ({
  id, title: id, date: '2026-05-01', allDay: false, startTime, endTime,
  category: 'work', pinned: false,
});

const widths = (out: ReturnType<typeof computeEventLayouts>) =>
  out.map((l) => String(l.style.width));

describe('computeEventLayouts', () => {
  it('gives a lone event the full column', () => {
    const [only] = computeEventLayouts([ev('a', '09:00', '10:00')]);
    expect(only.style.top).toBe(540);
    expect(only.style.height).toBe(60);
    expect(String(only.style.width)).toBe('calc(100% - 8px)');
    expect(String(only.style.left)).toBe('calc(0% + 4px)');
  });

  it('gives sequential non-overlapping events the full column each', () => {
    const out = computeEventLayouts([ev('a', '09:00', '10:00'), ev('b', '11:00', '12:00')]);
    expect(widths(out)).toEqual(['calc(100% - 8px)', 'calc(100% - 8px)']);
  });

  it('splits two genuinely overlapping events in half', () => {
    const out = computeEventLayouts([ev('a', '09:00', '10:30'), ev('b', '10:00', '11:00')]);
    expect(widths(out)).toEqual(['calc(50% - 8px)', 'calc(50% - 8px)']);
    expect(String(out[0].style.left)).toBe('calc(0% + 4px)');
    expect(String(out[1].style.left)).toBe('calc(50% + 4px)');
  });

  it('reuses a freed column instead of one per event in a transitive chain', () => {
    // a and c do not overlap each other, so the chain needs 2 columns, not 3.
    const out = computeEventLayouts([
      ev('a', '09:00', '10:00'), ev('b', '09:30', '10:30'), ev('c', '10:00', '11:00'),
    ]);
    expect(widths(out)).toEqual(['calc(50% - 8px)', 'calc(50% - 8px)', 'calc(50% - 8px)']);
    expect(out.map((l) => String(l.style.left)))
      .toEqual(['calc(0% + 4px)', 'calc(50% + 4px)', 'calc(0% + 4px)']);
  });

  it('sorts output by start time', () => {
    const out = computeEventLayouts([ev('late', '15:00', '16:00'), ev('early', '08:00', '09:00')]);
    expect(out.map((l) => l.event.id)).toEqual(['early', 'late']);
  });

  it('enforces a minimum height so zero-length events stay clickable', () => {
    const [only] = computeEventLayouts([ev('a', '09:00', '09:00')]);
    expect(only.style.height).toBe(20);
  });

  it('clamps an end time that precedes its start instead of going negative', () => {
    const [only] = computeEventLayouts([ev('a', '14:00', '09:00')]);
    expect(Number(only.style.height)).toBeGreaterThan(0);
    expect(only.style.top).toBe(840);
  });

  it('defaults a missing end time to one hour', () => {
    const [only] = computeEventLayouts([ev('a', '09:00', undefined)]);
    expect(only.style.height).toBe(60);
  });

  it('treats a missing start time as midnight rather than NaN', () => {
    const [only] = computeEventLayouts([ev('a', undefined, undefined)]);
    expect(only.style.top).toBe(0);
    expect(Number.isNaN(Number(only.style.height))).toBe(false);
  });

  it('handles an empty list', () => {
    expect(computeEventLayouts([])).toEqual([]);
  });
});
