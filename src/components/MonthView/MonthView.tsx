import { getDaysInMonth } from 'date-fns';
import useStore from '../../store/useStore';
import { monthRange, toISODate } from '../../utils/dateHelpers';
import { useEventsForMonth } from '../../db/queries';
import { DayCell } from './DayCell';
import styles from './MonthView.module.css';

export function MonthView() {
  const { currentYear, currentMonth } = useStore();
  const { start, end } = monthRange(currentYear, currentMonth);
  const events = useEventsForMonth(start, end);
  if (events === undefined) return <div>Loading…</div>;

  const first = new Date(currentYear, currentMonth, 1);
  const pad = first.getDay();
  const cells = [...Array(pad).fill(null), ...Array.from({ length: getDaysInMonth(first) }, (_, i) => i + 1)];

  return (
    <div className={styles.wrap}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className={styles.dow}>{d}</div>)}
      {cells.map((day, i) => {
        if (day === null) return <div key={`e-${i}`} className={styles.empty} />;
        const iso = toISODate(new Date(currentYear, currentMonth, day));
        return <DayCell key={iso} day={day} iso={iso} events={events.filter((e) => e.date === iso)} />;
      })}
    </div>
  );
}
