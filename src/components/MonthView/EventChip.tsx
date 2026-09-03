import type { CalendarEvent } from '../../types';
import styles from './MonthView.module.css';

export function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const time = !event.allDay && event.startTime ? `${event.startTime} ` : '';
  return (
    <button
      type="button"
      className={styles.chip}
      data-category={event.category}
      title={event.description || undefined}
      aria-label={`Edit ${event.title}${time ? ` at ${event.startTime}` : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {time}{event.title}
    </button>
  );
}
