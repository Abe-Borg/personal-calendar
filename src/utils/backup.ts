import { db } from '../db/db';
import type { Attachment, CalendarEvent, StickyNote } from '../types';

interface ExportedAttachment extends Omit<Attachment, 'data'> {
  data: string;
}

interface ExportFile {
  version: 1;
  exportedAt: string;
  events: CalendarEvent[];
  notes: StickyNote[];
  attachments: ExportedAttachment[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export async function exportToJson(): Promise<string> {
  const [events, notes, attachments] = await Promise.all([
    db.events.toArray(),
    db.notes.toArray(),
    db.attachments.toArray(),
  ]);
  const serializedAttachments = await Promise.all(
    attachments.map(async (a) => ({ ...a, data: await blobToBase64(a.data) })),
  );
  const out: ExportFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    notes,
    attachments: serializedAttachments,
  };
  return JSON.stringify(out, null, 2);
}

export async function importFromJson(json: string): Promise<{ events: number; notes: number; attachments: number }> {
  const data = JSON.parse(json) as Partial<ExportFile>;
  const events = data.events ?? [];
  const notes = data.notes ?? [];
  const attachments: Attachment[] = (data.attachments ?? []).map((a) => ({
    ...a,
    data: base64ToBlob(a.data, a.mimeType),
  }));
  await db.transaction('rw', db.events, db.notes, db.attachments, async () => {
    if (events.length) await db.events.bulkPut(events);
    if (notes.length) await db.notes.bulkPut(notes);
    if (attachments.length) await db.attachments.bulkPut(attachments);
  });
  return { events: events.length, notes: notes.length, attachments: attachments.length };
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
