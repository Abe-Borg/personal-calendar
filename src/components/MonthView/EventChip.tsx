import type { CalendarEvent } from '../../types';
import styles from './MonthView.module.css';

export function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <div
      className={styles.chip}
      data-category={event.category}
      title={event.description || undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {!event.allDay && <span>{event.startTime} </span>}
      <span>{event.title}</span>
    </div>
  );
}
