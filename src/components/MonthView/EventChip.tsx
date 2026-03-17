import type { CalendarEvent } from '../../types';
import { CATEGORY_COLORS } from '../../utils/colors';
import styles from './MonthView.module.css';

export function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const c = CATEGORY_COLORS[event.category];
  return (
    <div
      style={{ background: c.bg, color: c.text }}
      className={styles.chip}
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
