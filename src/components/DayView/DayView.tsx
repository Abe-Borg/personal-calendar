import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import useStore from '../../store/useStore';
import { useEventsForDate } from '../../db/queries';
import { useCalendarNav } from '../../utils/navigation';
import { computeEventLayouts } from '../../utils/eventLayout';
import { fromISODate, todayISO } from '../../utils/dateHelpers';
import styles from './DayView.module.css';

const SCROLL_TO_HOUR = 7;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const pad = (n: number) => String(n).padStart(2, '0');
const nowMinutes = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

export function DayView() {
  const selectedDate = useStore((s) => s.selectedDate);
  const openEditModal = useStore((s) => s.openEditModal);
  const openAddModal = useStore((s) => s.openAddModal);
  const nav = useCalendarNav();
  const day = selectedDate ?? todayISO();
  const events = useEventsForDate(day);
  const isToday = day === todayISO();
  const [now, setNow] = useState(nowMinutes);

  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(timer);
  }, [isToday]);

  // Keyed on `day` so the scroll re-runs when the grid remounts for a new date.
  // The previous effect used [] deps and fired while the view still rendered
  // "Loading…", so the grid did not exist and the scroll silently never applied.
  const attachGrid = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) node.scrollTop = SCROLL_TO_HOUR * 60;
    },
    [day],
  );

  if (events === undefined) return <div className={styles.empty}>Loading…</div>;

  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const layouts = computeEventLayouts(timed);
  const date = fromISODate(day);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" onClick={() => nav.goToMonth(date.getFullYear(), date.getMonth())}>
          ← Month
        </button>
        <h3>{format(date, 'EEEE, MMMM d, yyyy')}{isToday && <span className={styles.todayTag}>Today</span>}</h3>
        <button type="button" className={styles.addBtn} onClick={() => openAddModal(day)}>+ Add</button>
      </div>

      <div className={styles.allday}>
        <span className={styles.alldayLabel}>All day</span>
        {allDay.length === 0 ? (
          <span className={styles.hint}>Nothing all day</span>
        ) : (
          allDay.map((e) => (
            <button
              type="button"
              key={e.id}
              className={styles.alldayChip}
              data-category={e.category}
              title={e.description || undefined}
              onClick={() => openEditModal(e.id)}
            >
              {e.title}
            </button>
          ))
        )}
      </div>

      {/* The timeline renders even on an empty day — hiding it removed the only
          way to create an event at a specific time. */}
      <div className={styles.grid} ref={attachGrid}>
        <div className={styles.canvas}>
          {HOURS.map((h) => (
            <button
              type="button"
              key={h}
              className={styles.row}
              style={{ top: h * 60 }}
              aria-label={`Add event at ${pad(h)}:00`}
              onClick={() => openAddModal(day, `${pad(h)}:00`)}
            >
              <span className={styles.rowLabel}>{pad(h)}:00</span>
            </button>
          ))}
          {layouts.map((l) => (
            <button
              type="button"
              key={l.event.id}
              className={styles.event}
              data-category={l.event.category}
              style={l.style}
              title={l.event.description || undefined}
              onClick={() => openEditModal(l.event.id)}
            >
              <span className={styles.eventTime}>{l.event.startTime}</span>
              <span className={styles.eventTitle}>{l.event.title}</span>
            </button>
          ))}
          {isToday && <div className={styles.now} style={{ top: now }} aria-hidden="true" />}
        </div>
      </div>

      {timed.length === 0 && allDay.length === 0 && (
        <p className={styles.hintRow}>Nothing scheduled. Click any hour above, or press <kbd>N</kbd>.</p>
      )}
    </div>
  );
}
