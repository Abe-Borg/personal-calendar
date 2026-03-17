import useStore from '../../store/useStore';
import { useCalendarNav } from '../../utils/navigation';
import type { CalendarEvent } from '../../types';
import { EventChip } from './EventChip';
import styles from './MonthView.module.css';

export function DayCell({ day, iso, events }: { day: number; iso: string; events: CalendarEvent[] }) {
  const openEditModal = useStore((s) => s.openEditModal);
  const { goToDay } = useCalendarNav();
  const visible = events.slice(0, 3);
  return (
    <button className={styles.cell} onClick={() => goToDay(new Date(iso))}>
      <div>{day}</div>
      {visible.map((event) => <EventChip key={event.id} event={event} onClick={() => openEditModal(event.id)} />)}
      {events.length > 3 && <div className={styles.more}>+{events.length - 3} more</div>}
    </button>
  );
}
