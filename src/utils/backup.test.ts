import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import {
  EXPORT_VERSION, ImportError, base64ToBlob, blobToBase64,
  exportToJson, importFromJson, parseAttachment, parseEvent, parseNote,
} from './backup';
import type { CalendarEvent, StickyNote } from '../types';

const validEvent = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1', title: 'Kickoff', date: '2026-05-01', allDay: true,
  category: 'work', pinned: false, ...over,
});

const validNote = (over: Partial<StickyNote> = {}): StickyNote => ({
  id: 'n1', content: 'hello', color: 'yellow', pinned: false, order: 0,
  createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z', ...over,
});

const backup = (over: Record<string, unknown> = {}) => JSON.stringify({
  version: EXPORT_VERSION, exportedAt: '2026-05-01T00:00:00.000Z',
  events: [], notes: [], attachments: [], ...over,
});

beforeEach(async () => {
  await db.open();
  await Promise.all([db.events.clear(), db.notes.clear(), db.attachments.clear()]);
});

describe('base64 round-trip', () => {
  it('survives arbitrary binary bytes', async () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 200, 250, 255]);
    const round = base64ToBlob(await blobToBase64(new Blob([bytes])), 'application/octet-stream');
    expect(Array.from(new Uint8Array(await round.arrayBuffer()))).toEqual(Array.from(bytes));
  });

  it('survives a blob larger than one encoding chunk', async () => {
    const big = new Uint8Array(100_000).map((_, i) => i % 256);
    const round = base64ToBlob(await blobToBase64(new Blob([big])), 'application/octet-stream');
    const out = new Uint8Array(await round.arrayBuffer());
    expect(out.length).toBe(big.length);
    expect(out[99_999]).toBe(big[99_999]);
  });

  it('preserves the mime type', async () => {
    expect(base64ToBlob(await blobToBase64(new Blob(['x'])), 'image/png').type).toBe('image/png');
  });
});

describe('parseEvent', () => {
  it('accepts a well-formed event', () => {
    expect(parseEvent(validEvent())?.id).toBe('e1');
  });
  it('rejects rows with a bad or missing date', () => {
    expect(parseEvent(validEvent({ date: 'tomorrow' }))).toBeNull();
    expect(parseEvent({ ...validEvent(), date: undefined })).toBeNull();
  });
  it('rejects an unknown category rather than storing it', () => {
    expect(parseEvent({ ...validEvent(), category: 'sprinklers' })).toBeNull();
  });
  it('rejects non-objects', () => {
    for (const bad of [null, undefined, 42, 'x', []]) expect(parseEvent(bad)).toBeNull();
  });
  it('drops times on an all-day event and keeps them otherwise', () => {
    expect(parseEvent(validEvent({ allDay: true, startTime: '09:00' }))?.startTime).toBeUndefined();
    expect(parseEvent(validEvent({ allDay: false, startTime: '09:00' }))?.startTime).toBe('09:00');
  });
  it('drops a malformed time instead of persisting it', () => {
    expect(parseEvent({ ...validEvent(), allDay: false, startTime: '25:99' })?.startTime).toBeUndefined();
  });
  it('drops recurrenceEnd when recurrence is absent', () => {
    const out = parseEvent({ ...validEvent(), recurrenceEnd: '2026-06-01' });
    expect(out?.recurrence).toBeUndefined();
    expect(out?.recurrenceEnd).toBeUndefined();
  });
  it('ignores an unknown recurrence frequency', () => {
    expect(parseEvent({ ...validEvent(), recurrence: 'fortnightly' })?.recurrence).toBeUndefined();
  });
});

describe('parseNote / parseAttachment', () => {
  it('falls back to a safe colour and order', () => {
    const out = parseNote({ id: 'n', content: 'x', color: 'chartreuse' }, 7);
    expect(out?.color).toBe('yellow');
    expect(out?.order).toBe(7);
  });
  it('rejects a note with no id', () => {
    expect(parseNote({ content: 'x' }, 0)).toBeNull();
  });
  it('rejects an attachment that belongs to nothing', () => {
    expect(parseAttachment({ id: 'a', data: 'AAA=', mimeType: 'text/plain' })).toBeNull();
  });
  it('accepts an attachment bound to an event', () => {
    expect(parseAttachment({ id: 'a', eventId: 'e1', data: 'AAA=', mimeType: 'text/plain' })?.id).toBe('a');
  });
});

describe('importFromJson rejects bad input', () => {
  it('rejects text that is not JSON', async () => {
    await expect(importFromJson('<html>nope')).rejects.toBeInstanceOf(ImportError);
  });
  it('rejects JSON that is not a calendar backup', async () => {
    await expect(importFromJson('{"hello":"world"}')).rejects.toBeInstanceOf(ImportError);
    await expect(importFromJson('[1,2,3]')).rejects.toBeInstanceOf(ImportError);
  });
  it('rejects a backup from a newer version', async () => {
    await expect(importFromJson(backup({ version: EXPORT_VERSION + 1 })))
      .rejects.toThrow(/only understands version/);
  });
  it('writes nothing when it rejects a file', async () => {
    await importFromJson(backup({ events: [validEvent()] }));
    await expect(importFromJson('garbage')).rejects.toBeInstanceOf(ImportError);
    expect(await db.events.count()).toBe(1);
  });
});

describe('importFromJson survives malformed rows', () => {
  it('skips bad rows, counts them, and keeps the good ones', async () => {
    const summary = await importFromJson(backup({
      events: [validEvent({ id: 'good' }), { id: 'bad', title: 'x', date: 'nope', category: 'work' }, null],
    }));
    expect(summary.events).toBe(1);
    expect(summary.skipped).toBe(2);
    expect((await db.events.toArray()).map((e) => e.id)).toEqual(['good']);
  });

  it('merges rather than replacing, so existing rows survive', async () => {
    await db.events.put(validEvent({ id: 'mine', title: 'Mine' }));
    await importFromJson(backup({ events: [validEvent({ id: 'theirs' })] }));
    expect((await db.events.toArray()).map((e) => e.id).sort()).toEqual(['mine', 'theirs']);
  });

  it('updates a row with the same id', async () => {
    await db.events.put(validEvent({ id: 'e1', title: 'Old' }));
    await importFromJson(backup({ events: [validEvent({ id: 'e1', title: 'New' })] }));
    expect((await db.events.get('e1'))?.title).toBe('New');
  });
});

describe('export -> import round trip', () => {
  it('restores events, notes and binary attachments intact', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 255]);
    await db.events.put(validEvent({ id: 'e1', description: 'agenda', pinned: true }));
    await db.notes.put(validNote({ id: 'n1', color: 'green' }));
    await db.attachments.put({
      id: 'a1', eventId: 'e1', name: 'plan.bin', mimeType: 'application/octet-stream',
      size: bytes.length, data: new Blob([bytes]), createdAt: '2026-05-01T00:00:00.000Z',
    });

    const json = await exportToJson();
    await Promise.all([db.events.clear(), db.notes.clear(), db.attachments.clear()]);

    const summary = await importFromJson(json);
    expect(summary).toMatchObject({ events: 1, notes: 1, attachments: 1, skipped: 0 });

    expect((await db.events.get('e1'))?.description).toBe('agenda');
    expect((await db.events.get('e1'))?.pinned).toBe(true);
    expect((await db.notes.get('n1'))?.color).toBe('green');

    const restored = await db.attachments.get('a1');
    expect(restored?.name).toBe('plan.bin');
    expect(Array.from(new Uint8Array(await restored!.data.arrayBuffer()))).toEqual(Array.from(bytes));
  });

  it('round-trips a recurring event with its end date', async () => {
    await db.events.put(validEvent({ id: 'r1', recurrence: 'monthly', recurrenceEnd: '2026-12-31' }));
    const json = await exportToJson();
    await db.events.clear();
    await importFromJson(json);
    const out = await db.events.get('r1');
    expect(out?.recurrence).toBe('monthly');
    expect(out?.recurrenceEnd).toBe('2026-12-31');
  });

  it('produces a file that declares its version', async () => {
    expect(JSON.parse(await exportToJson()).version).toBe(EXPORT_VERSION);
  });
});

describe('import does not create unreachable or misordered rows', () => {
  it('skips an attachment whose parent row is nowhere to be found', async () => {
    const summary = await importFromJson(backup({
      attachments: [{ id: 'orphan', eventId: 'no-such-event', data: 'AAA=', name: 'ghost.bin', mimeType: 'application/octet-stream' }],
    }));
    expect(summary.attachments).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(await db.attachments.count()).toBe(0);
  });

  it('keeps an attachment whose parent arrives in the same file', async () => {
    const summary = await importFromJson(backup({
      events: [validEvent({ id: 'e1' })],
      attachments: [{ id: 'a1', eventId: 'e1', data: 'AAA=', name: 'ok.bin', mimeType: 'application/octet-stream' }],
    }));
    expect(summary.attachments).toBe(1);
    expect(summary.skipped).toBe(0);
  });

  it('keeps an attachment whose parent already exists locally', async () => {
    await db.events.put(validEvent({ id: 'local' }));
    const summary = await importFromJson(backup({
      attachments: [{ id: 'a2', eventId: 'local', data: 'AAA=', name: 'ok.bin', mimeType: 'application/octet-stream' }],
    }));
    expect(summary.attachments).toBe(1);
  });

  it('appends imported notes after existing ones instead of interleaving', async () => {
    await db.notes.put(validNote({ id: 'mine-a', content: 'mine A', order: 0 }));
    await db.notes.put(validNote({ id: 'mine-b', content: 'mine B', order: 1 }));
    await importFromJson(backup({
      notes: [
        validNote({ id: 'in-1', content: 'imported 1', order: 0 }),
        validNote({ id: 'in-2', content: 'imported 2', order: 1 }),
      ],
    }));
    const ordered = (await db.notes.orderBy('order').toArray()).map((n) => n.content);
    expect(ordered).toEqual(['mine A', 'mine B', 'imported 1', 'imported 2']);
  });

  it('leaves a re-imported note where it already sits', async () => {
    await db.notes.put(validNote({ id: 'n1', content: 'first', order: 0 }));
    await db.notes.put(validNote({ id: 'n2', content: 'second', order: 1 }));
    await importFromJson(backup({ notes: [validNote({ id: 'n1', content: 'first edited', order: 0 })] }));
    const ordered = (await db.notes.orderBy('order').toArray()).map((n) => n.content);
    expect(ordered).toEqual(['first edited', 'second']);
  });
});

describe('attachment size reflects the decoded bytes', () => {
  it('ignores a size the file claims but did not deliver', () => {
    const parsed = parseAttachment({
      id: 'a', eventId: 'e', data: '', name: 'movie.mp4', mimeType: 'video/mp4', size: 402653167,
    });
    expect(parsed?.size).toBe(0);
  });

  it('reports the real length for a genuine payload', () => {
    // "AAAA" decodes to 3 bytes
    expect(parseAttachment({ id: 'a', eventId: 'e', data: 'AAAA', mimeType: 'application/octet-stream' })?.size).toBe(3);
  });
});
