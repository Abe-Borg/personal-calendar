import { db } from '../db/db';
import {
  EVENT_CATEGORIES, NOTE_COLOR_NAMES, RECURRENCE_FREQUENCIES,
  type Attachment, type CalendarEvent, type StickyNote,
} from '../types';
import { isISODate, isTimeString } from './dateHelpers';

export const EXPORT_VERSION = 1;

interface ExportedAttachment extends Omit<Attachment, 'data'> {
  data: string;
}

export interface ExportFile {
  version: number;
  exportedAt: string;
  events: CalendarEvent[];
  notes: StickyNote[];
  attachments: ExportedAttachment[];
}

export interface ImportSummary {
  events: number;
  notes: number;
  attachments: number;
  skipped: number;
}

export class ImportError extends Error {}

const CATEGORIES = new Set<string>(EVENT_CATEGORIES);
const COLORS = new Set<string>(NOTE_COLOR_NAMES);
const FREQUENCIES = new Set<string>(RECURRENCE_FREQUENCIES);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

// btoa/atob rather than FileReader: FileReader is browser-only, which made the
// only backup path in a local-first app impossible to test.
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  return new Blob([base64ToArrayBuffer(base64)], { type: mimeType });
}

export function parseEvent(raw: unknown): CalendarEvent | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || typeof raw.title !== 'string') return null;
  if (!isISODate(raw.date)) return null;
  if (!CATEGORIES.has(raw.category as string)) return null;

  const allDay = raw.allDay !== false;
  const event: CalendarEvent = {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    allDay,
    category: raw.category as CalendarEvent['category'],
    pinned: raw.pinned === true,
  };
  if (!allDay && isTimeString(raw.startTime)) event.startTime = raw.startTime;
  if (!allDay && isTimeString(raw.endTime)) event.endTime = raw.endTime;
  if (typeof raw.description === 'string' && raw.description) event.description = raw.description;
  if (FREQUENCIES.has(raw.recurrence as string)) {
    event.recurrence = raw.recurrence as CalendarEvent['recurrence'];
    if (isISODate(raw.recurrenceEnd)) event.recurrenceEnd = raw.recurrenceEnd;
  }
  return event;
}

export function parseNote(raw: unknown, fallbackOrder: number): StickyNote | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || typeof raw.content !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: raw.id,
    content: raw.content,
    color: COLORS.has(raw.color as string) ? (raw.color as StickyNote['color']) : 'yellow',
    pinned: raw.pinned === true,
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export function parseAttachment(raw: unknown): Attachment | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || typeof raw.data !== 'string') return null;
  if (!isNonEmptyString(raw.eventId) && !isNonEmptyString(raw.noteId)) return null;

  let blob: Blob;
  try {
    blob = base64ToBlob(raw.data, typeof raw.mimeType === 'string' ? raw.mimeType : '');
  } catch {
    return null;
  }
  return {
    id: raw.id,
    eventId: isNonEmptyString(raw.eventId) ? raw.eventId : undefined,
    noteId: isNonEmptyString(raw.noteId) ? raw.noteId : undefined,
    name: typeof raw.name === 'string' ? raw.name : 'attachment',
    mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : '',
    size: typeof raw.size === 'number' && raw.size >= 0 ? raw.size : blob.size,
    data: blob,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

export async function exportToJson(): Promise<string> {
  const [events, notes, attachments] = await Promise.all([
    db.events.toArray(),
    db.notes.toArray(),
    db.attachments.toArray(),
  ]);
  const serialized = await Promise.all(
    attachments.map(async (a) => ({ ...a, data: await blobToBase64(a.data) })),
  );
  const out: ExportFile = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    events,
    notes,
    attachments: serialized,
  };
  return JSON.stringify(out, null, 2);
}

/**
 * Merges by primary key rather than replacing, so importing never destroys rows
 * the file does not mention. Malformed rows are skipped and counted instead of
 * being written straight into IndexedDB.
 */
export async function importFromJson(json: string): Promise<ImportSummary> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }
  if (!isRecord(data)) throw new ImportError('That file is not a calendar backup.');
  if (typeof data.version !== 'number') throw new ImportError('That file is not a calendar backup.');
  if (data.version > EXPORT_VERSION) {
    throw new ImportError(
      `This backup is version ${data.version}, but this build only understands version ${EXPORT_VERSION}. Update the app first.`,
    );
  }
  if (!Array.isArray(data.events) && !Array.isArray(data.notes) && !Array.isArray(data.attachments)) {
    throw new ImportError('That file is not a calendar backup.');
  }

  let skipped = 0;
  const keep = <T>(parsed: T | null): parsed is T => {
    if (parsed === null) skipped++;
    return parsed !== null;
  };

  const events = (Array.isArray(data.events) ? data.events : []).map(parseEvent).filter(keep);
  const notes = (Array.isArray(data.notes) ? data.notes : [])
    .map((raw, i) => parseNote(raw, i)).filter(keep);
  const attachments = (Array.isArray(data.attachments) ? data.attachments : [])
    .map(parseAttachment).filter(keep);

  await db.transaction('rw', db.events, db.notes, db.attachments, async () => {
    if (events.length) await db.events.bulkPut(events);
    if (notes.length) await db.notes.bulkPut(notes);
    if (attachments.length) await db.attachments.bulkPut(attachments);
  });

  return { events: events.length, notes: notes.length, attachments: attachments.length, skipped };
}

export function downloadJson(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  // Detached anchors do not reliably fire, and revoking in the same tick can
  // cancel the download before it starts.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
