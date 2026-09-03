import type { CSSProperties } from 'react';
import type { CalendarEvent } from '../types';
import { minutesFromMidnight } from './dateHelpers';

export interface EventLayout {
  event: CalendarEvent;
  style: CSSProperties;
}

/** One minute of the day is one pixel tall, matching the 60px hour rows in DayView. */
const MIN_HEIGHT_MINUTES = 20;
const DEFAULT_DURATION_MINUTES = 60;

interface Span { event: CalendarEvent; start: number; end: number }

export function computeEventLayouts(events: CalendarEvent[]): EventLayout[] {
  const spans: Span[] = events
    .map((event) => {
      const start = minutesFromMidnight(event.startTime, 0);
      const end = minutesFromMidnight(event.endTime, start + DEFAULT_DURATION_MINUTES);
      return { event, start, end: Math.max(end, start + MIN_HEIGHT_MINUTES) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: EventLayout[] = [];
  let cluster: Span[] = [];
  let clusterEnd = -Infinity;

  /**
   * Within a cluster, pack greedily into the first column that is already free.
   * Sizing every event by the cluster's total size instead would shrink a chain
   * of five sequential-but-transitively-linked events to 20% width each.
   */
  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const placed = cluster.map((span) => {
      let column = columnEnds.findIndex((end) => end <= span.start);
      if (column === -1) {
        columnEnds.push(span.end);
        column = columnEnds.length - 1;
      } else {
        columnEnds[column] = span.end;
      }
      return { span, column };
    });

    const width = 100 / columnEnds.length;
    for (const { span, column } of placed) {
      out.push({
        event: span.event,
        style: {
          position: 'absolute',
          top: span.start,
          height: span.end - span.start,
          left: `calc(${column * width}% + 4px)`,
          width: `calc(${width}% - 8px)`,
        },
      });
    }
    cluster = [];
  };

  for (const span of spans) {
    if (cluster.length && span.start >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(span);
    clusterEnd = Math.max(clusterEnd, span.end);
  }
  flush();

  return out;
}
