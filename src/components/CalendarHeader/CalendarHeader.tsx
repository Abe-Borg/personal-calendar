import { format } from 'date-fns';
import useStore from '../../store/useStore';
import { useCalendarNav } from '../../utils/navigation';
import styles from './CalendarHeader.module.css';

export function CalendarHeader() {
  const { currentYear, currentMonth, openAddModal } = useStore();
  const nav = useCalendarNav();
  return (
    <header className={styles.header}>
      <div>
        <button aria-label="Previous month" onClick={() => nav.navigateMonth(-1, currentYear, currentMonth)}>←</button>
        <button aria-label="Next month" onClick={() => nav.navigateMonth(1, currentYear, currentMonth)}>→</button>
        <button onClick={nav.goToToday}>Today</button>
      </div>
      <h2>{format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy')}</h2>
      <button onClick={() => openAddModal()}>+ Add Event</button>
    </header>
  );
}
