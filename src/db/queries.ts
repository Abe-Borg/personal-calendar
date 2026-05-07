import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { expandRecurring } from '../utils/recurrence';
import type { CalendarEvent, StickyNote } from '../types';

export async function addEvent(data: Omit<CalendarEvent, 'id'>): Promise<string> {
  const id = crypto.randomUUID();
  await db.events.add({ ...data, id });
  return id;
}

export async function updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<void> {
  await db.events.update(id, patch);
}

export async function deleteEvent(id: string): Promise<void> {
  await db.transaction('rw', db.events, db.attachments, async () => {
    await db.events.delete(id);
    await db.attachments.where('eventId').equals(id).delete();
  });
}

export async function deleteEventWithSnapshot(id: string): Promise<(() => Promise<void>) | null> {
  const event = await db.events.get(id);
  if (!event) return null;
  const attachments = await db.attachments.where('eventId').equals(id).toArray();
  await deleteEvent(id);
  return async () => {
    await db.transaction('rw', db.events, db.attachments, async () => {
      await db.events.add(event);
      if (attachments.length) await db.attachments.bulkAdd(attachments);
    });
  };
}

export function useEventsForMonth(startDate: string, endDate: string) {
  return useLiveQuery(async () => {
    const candidates = await db.events.where('date').belowOrEqual(endDate).toArray();
    return expandRecurring(candidates, startDate, endDate);
  }, [startDate, endDate]);
}

export function useEventsForDate(date: string) {
  return useLiveQuery(async () => {
    const candidates = await db.events.where('date').belowOrEqual(date).toArray();
    return expandRecurring(candidates, date, date);
  }, [date]);
}

export function usePinnedEvents() {
  return useLiveQuery(() => db.events.filter((e) => e.pinned).toArray(), []);
}

export async function addNote(data: Omit<StickyNote, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const last = await db.notes.orderBy('order').last();
  await db.notes.add({ ...data, id, order: (last?.order ?? -1) + 1, createdAt: now, updatedAt: now });
  return id;
}

export async function updateNote(id: string, patch: Partial<StickyNote>): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteNote(id: string): Promise<void> {
  await db.transaction('rw', db.notes, db.attachments, async () => {
    await db.notes.delete(id);
    await db.attachments.where('noteId').equals(id).delete();
  });
}

export async function deleteNoteWithSnapshot(id: string): Promise<(() => Promise<void>) | null> {
  const note = await db.notes.get(id);
  if (!note) return null;
  const attachments = await db.attachments.where('noteId').equals(id).toArray();
  await deleteNote(id);
  return async () => {
    await db.transaction('rw', db.notes, db.attachments, async () => {
      await db.notes.add(note);
      if (attachments.length) await db.attachments.bulkAdd(attachments);
    });
  };
}

export async function reorderNotes(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.notes, async () => {
    await Promise.all(orderedIds.map((id, index) => db.notes.update(id, { order: index })));
  });
}

export function useNotes() {
  return useLiveQuery(() => db.notes.orderBy('order').toArray(), []);
}

export async function addAttachment(file: File, target: { eventId: string } | { noteId: string }): Promise<string> {
  const id = crypto.randomUUID();
  await db.attachments.add({
    id,
    eventId: 'eventId' in target ? target.eventId : undefined,
    noteId: 'noteId' in target ? target.noteId : undefined,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    data: file,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.attachments.delete(id);
}

export function useAttachmentsForEvent(eventId: string) {
  return useLiveQuery(() => db.attachments.where('eventId').equals(eventId).toArray(), [eventId]);
}

export function useAttachmentsForNote(noteId: string) {
  return useLiveQuery(() => db.attachments.where('noteId').equals(noteId).toArray(), [noteId]);
}
