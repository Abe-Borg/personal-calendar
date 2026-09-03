import { format } from 'date-fns';
import useStore from '../../store/useStore';
import { useCalendarNav } from '../../utils/navigation';
import styles from './CalendarHeader.module.css';

export function CalendarHeader() {
  const currentYear = useStore((s) => s.currentYear);
  const currentMonth = useStore((s) => s.currentMonth);
  const openAddModal = useStore((s) => s.openAddModal);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const nav = useCalendarNav();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button type="button" className={styles.toggle} onClick={toggleSidebar} aria-label="Toggle sidebar">☰</button>
        <button type="button" aria-label="Previous month" onClick={() => nav.navigateMonth(-1, currentYear, currentMonth)}>←</button>
        <button type="button" aria-label="Next month" onClick={() => nav.navigateMonth(1, currentYear, currentMonth)}>→</button>
        <button type="button" onClick={nav.goToToday}>Today</button>
      </div>
      <h2 className={styles.title}>{format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy')}</h2>
      <div className={styles.right}>
        <button type="button" className={styles.add} onClick={() => openAddModal()}>+ Add Event</button>
      </div>
    </header>
  );
}
