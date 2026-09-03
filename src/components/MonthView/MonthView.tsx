import { getDaysInMonth } from 'date-fns';
import useStore from '../../store/useStore';
import { monthRange, todayISO, toISODate } from '../../utils/dateHelpers';
import { useEventsForMonth, useLibraryCounts } from '../../db/queries';
import { DayCell } from './DayCell';
import styles from './MonthView.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView() {
  const currentYear = useStore((s) => s.currentYear);
  const currentMonth = useStore((s) => s.currentMonth);
  const openAddModal = useStore((s) => s.openAddModal);
  const { start, end } = monthRange(currentYear, currentMonth);
  const events = useEventsForMonth(start, end);
  const counts = useLibraryCounts();

  if (events === undefined) return <div className={styles.loading}>Loading…</div>;

  const first = new Date(currentYear, currentMonth, 1);
  const cells: (number | null)[] = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: getDaysInMonth(first) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const today = todayISO();
  const byDate = new Map<string, typeof events>();
  for (const event of events) {
    const bucket = byDate.get(event.date);
    if (bucket) bucket.push(event);
    else byDate.set(event.date, [event]);
  }

  return (
    <>
      {counts && counts.events === 0 && counts.notes === 0 && (
        <div className={styles.firstRun}>
          <strong>Nothing here yet.</strong> Click a day to open it, hit <kbd>+</kbd> on a day to add an
          event, or press <kbd>N</kbd>. Everything stays on this computer — use <strong>Export</strong> in
          the sidebar to keep a backup.
          <button type="button" className={styles.firstRunCta} onClick={() => openAddModal(today)}>
            Add your first event
          </button>
        </div>
      )}
      <div className={styles.wrap} role="grid" aria-label="Month view">
        <div className={styles.week} role="row">
          {DAY_NAMES.map((d) => (
            <div key={d} className={styles.dow} role="columnheader" aria-label={d}>{d}</div>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div className={styles.week} role="row" key={w}>
            {week.map((day, i) => {
              if (day === null) return <div key={`e-${w}-${i}`} className={styles.empty} role="gridcell" />;
              const iso = toISODate(new Date(currentYear, currentMonth, day));
              return (
                <DayCell
                  key={iso}
                  day={day}
                  iso={iso}
                  isToday={iso === today}
                  events={byDate.get(iso) ?? []}
                />
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
