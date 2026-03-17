import { useEffect, useRef } from 'react';
import useStore from '../../store/useStore';
import { useEventsForDate } from '../../db/queries';
import { computeEventLayouts } from '../../utils/eventLayout';
import styles from './DayView.module.css';

function minutesFromMidnight() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function DayView() {
  const { selectedDate, goToMonthView } = useStore();
  const day = selectedDate ?? new Date().toISOString().slice(0, 10);
  const events = useEventsForDate(day);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 480;
  }, []);

  if (events === undefined) return <div>Loading…</div>;
  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const layouts = computeEventLayouts(timed);

  return (
    <div>
      <div className={styles.top}><button onClick={goToMonthView}>← Month</button><h3>{day}</h3></div>
      <div className={styles.allday}>{allDay.map((e) => <span key={e.id}>{e.title}</span>)}</div>
      <div className={styles.grid} ref={gridRef}>
        <div className={styles.canvas}>
          {Array.from({ length: 24 }).map((_, h) => <div key={h} className={styles.row}>{`${String(h).padStart(2, '0')}:00`}</div>)}
          {layouts.map((l) => <div key={l.event.id} className={styles.event} style={l.style}>{l.event.title}</div>)}
          <div className={styles.now} style={{ top: minutesFromMidnight() }} />
        </div>
      </div>
    </div>
  );
}
