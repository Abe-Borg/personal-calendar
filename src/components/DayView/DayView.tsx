import { useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import useStore from '../../store/useStore';
import { useEventsForDate } from '../../db/queries';
import { useCalendarNav } from '../../utils/navigation';
import { computeEventLayouts } from '../../utils/eventLayout';
import styles from './DayView.module.css';

function minutesFromMidnight() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function DayView() {
  const { selectedDate, openEditModal } = useStore();
  const nav = useCalendarNav();
  const day = selectedDate ?? new Date().toISOString().slice(0, 10);
  const events = useEventsForDate(day);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 480;
  }, []);

  if (events === undefined) return <div className={styles.empty}>Loading…</div>;
  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const layouts = computeEventLayouts(timed);
  const backToMonth = () => {
    const d = parseISO(day);
    nav.goToMonth(d.getFullYear(), d.getMonth());
  };
  const heading = format(parseISO(day), 'EEEE, MMMM d, yyyy');
  const isEmpty = events.length === 0;

  return (
    <div>
      <div className={styles.top}>
        <button onClick={backToMonth}>← Month</button>
        <h3>{heading}</h3>
      </div>
      <div className={styles.allday}>
        {allDay.length === 0
          ? <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>No all-day events</span>
          : allDay.map((e) => (
              <span
                key={e.id}
                className={styles.alldayChip}
                data-category={e.category}
                title={e.description || undefined}
                onClick={() => openEditModal(e.id)}
              >
                {e.title}
              </span>
            ))}
      </div>
      {isEmpty ? (
        <div className={styles.empty}>No events on this day. Press N to add one.</div>
      ) : (
        <div className={styles.grid} ref={gridRef}>
          <div className={styles.canvas}>
            {Array.from({ length: 24 }).map((_, h) => <div key={h} className={styles.row}>{`${String(h).padStart(2, '0')}:00`}</div>)}
            {layouts.map((l) => (
              <div
                key={l.event.id}
                className={styles.event}
                data-category={l.event.category}
                style={l.style}
                title={l.event.description || undefined}
                onClick={() => openEditModal(l.event.id)}
              >
                {l.event.title}
              </div>
            ))}
            <div className={styles.now} style={{ top: minutesFromMidnight() }} />
          </div>
        </div>
      )}
    </div>
  );
}
