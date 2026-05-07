import Dexie, { type Table } from 'dexie';
import type { Attachment, CalendarEvent, StickyNote } from '../types';

class CalendarDatabase extends Dexie {
  events!: Table<CalendarEvent>;
  notes!: Table<StickyNote>;
  attachments!: Table<Attachment>;

  constructor() {
    super('my-calendar-db');
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
