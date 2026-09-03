import { format } from 'date-fns';
import useStore from '../../store/useStore';
import { useCalendarNav } from '../../utils/navigation';
import { fromISODate } from '../../utils/dateHelpers';
import type { CalendarEvent } from '../../types';
import { EventChip } from './EventChip';
import styles from './MonthView.module.css';

const MAX_CHIPS = 3;

interface Props {
  day: number;
  iso: string;
  events: CalendarEvent[];
  isToday: boolean;
}

export function DayCell({ day, iso, events, isToday }: Props) {
  const openEditModal = useStore((s) => s.openEditModal);
  const openAddModal = useStore((s) => s.openAddModal);
  const { goToDay } = useCalendarNav();
  const visible = events.slice(0, MAX_CHIPS);
  const hidden = events.length - visible.length;
  const label = format(fromISODate(iso), 'EEEE, MMMM d');

  // The cell is a plain div: a <button> may not contain the chip buttons, and
  // nesting them made every chip click a stopPropagation workaround. Keyboard
  // users reach the day through the date button instead.
  return (
    <div className={styles.cell} data-today={isToday} onClick={() => goToDay(iso)} role="gridcell">
      <div className={styles.cellHeader}>
        <button
          type="button"
          className={styles.dayNum}
          aria-label={`Open ${label}`}
          aria-current={isToday ? 'date' : undefined}
          onClick={(e) => { e.stopPropagation(); goToDay(iso); }}
        >
          {day}
        </button>
        <button
          type="button"
          className={styles.addDay}
          aria-label={`Add event on ${label}`}
          onClick={(e) => { e.stopPropagation(); openAddModal(iso); }}
        >
          +
        </button>
      </div>
      {visible.map((event) => (
        <EventChip key={event.id} event={event} onClick={() => openEditModal(event.id)} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className={styles.more}
          aria-label={`Show ${hidden} more on ${label}`}
          onClick={(e) => { e.stopPropagation(); goToDay(iso); }}
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}
