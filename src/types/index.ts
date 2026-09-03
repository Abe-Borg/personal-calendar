export const EVENT_CATEGORIES = [
  'work', 'personal', 'milestone', 'design', 'review', 'deadline', 'meeting', 'other',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const NOTE_COLOR_NAMES = ['yellow', 'blue', 'green', 'pink'] as const;
export type NoteColor = (typeof NOTE_COLOR_NAMES)[number];

export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

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
