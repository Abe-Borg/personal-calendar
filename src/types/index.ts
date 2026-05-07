export type EventCategory =
  | 'work'
  | 'personal'
  | 'milestone'
  | 'design'
  | 'review'
  | 'deadline'
  | 'meeting'
  | 'other';

export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  category: EventCategory;
  description?: string;
  pinned: boolean;
  recurrence?: RecurrenceFrequency;
  recurrenceEnd?: string;
}

export interface StickyNote {
  id: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  eventId?: string;
  noteId?: string;
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
  createdAt: string;
}

export type CalendarView = 'month' | 'day';

export interface UIState {
  currentYear: number;
  currentMonth: number;
  selectedDate: string | null;
  view: CalendarView;
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalEventId: string | null;
  modalDefaultDate: string | null;
  modalDefaultTime: string | null;
}
