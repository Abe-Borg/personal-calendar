import Dexie, { type Table } from 'dexie';
import type { Attachment, CalendarEvent, StickyNote } from '../types';

class CalendarDatabase extends Dexie {
  events!: Table<CalendarEvent>;
  notes!: Table<StickyNote>;
  attachments!: Table<Attachment>;

  constructor() {
    super('my-calendar-db');
    // v1 indexed `pinned`; IndexedDB cannot index booleans, so v2 dropped it and
    // pinned queries filter in memory instead.
    this.version(1).stores({
      events: 'id, date, category, pinned',
      notes: 'id, order, pinned',
      attachments: 'id, eventId, noteId',
    });
    this.version(2).stores({
      events: 'id, date, category',
      notes: 'id, order',
      attachments: 'id, eventId, noteId',
    });
  }
}

export const db = new CalendarDatabase();

/**
 * IndexedDB is unavailable in some private-browsing modes and can be blocked by
 * browser settings. Without this the app renders an empty calendar and silently
 * discards everything the user types.
 */
export async function openDatabase(): Promise<string | null> {
  try {
    await db.open();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Unknown error';
  }
}
