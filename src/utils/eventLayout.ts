import type { CSSProperties } from 'react';
import type { CalendarEvent } from '../types';

export interface EventLayout {
  event: CalendarEvent;
  style: CSSProperties;
}

const toMinutes = (time = '00:00') => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const getTopHeight = (event: CalendarEvent) => {
  const top = toMinutes(event.startTime);
  const end = toMinutes(event.endTime ?? '23:59');
  return { top, height: Math.max(end - top, 20) };
};

export function computeEventLayouts(events: CalendarEvent[]): EventLayout[] {
  const sorted = [...events].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const clusters: CalendarEvent[][] = [];
  let cluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  for (const e of sorted) {
    const start = toMinutes(e.startTime);
    const end = toMinutes(e.endTime ?? '23:59');
    if (start < clusterEnd) {
      cluster.push(e);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      if (cluster.length) clusters.push(cluster);
      cluster = [e];
      clusterEnd = end;
    }
  }
  if (cluster.length) clusters.push(cluster);

  return clusters.flatMap((c) =>
    c.map((event, i) => {
      const widthPct = 100 / c.length;
      const { top, height } = getTopHeight(event);
      return {
        event,
        style: {
          position: 'absolute',
          top,
          height,
          left: `calc(${i * widthPct}% + 4px)`,
          width: `calc(${widthPct}% - 8px)`,
        },
      };
    }),
  );
}
