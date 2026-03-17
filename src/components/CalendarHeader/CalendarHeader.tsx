import { format } from 'date-fns';
import useStore from '../../store/useStore';
import styles from './CalendarHeader.module.css';

export function CalendarHeader() {
  const { currentYear, currentMonth, navigateMonth, goToToday, openAddModal } = useStore();
  return (
    <header className={styles.header}>
      <div>
        <button aria-label="Previous month" onClick={() => navigateMonth(-1)}>←</button>
        <button aria-label="Next month" onClick={() => navigateMonth(1)}>→</button>
        <button onClick={goToToday}>Today</button>
      </div>
      <h2>{format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy')}</h2>
      <button onClick={() => openAddModal()}>+ Add Event</button>
    </header>
  );
}
