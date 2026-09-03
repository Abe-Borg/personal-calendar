# Personal Calendar

A local-first personal calendar that runs entirely in the browser. No server, no account, no cloud — events, sticky notes, and file attachments live in IndexedDB on your own machine.

## What it does

- **Month view** with category-colored event chips (up to 3 per day + "+N more"), today highlighted, and a `+` on each day to add an event straight to it
- **Day view** with a 24-hour timeline, all-day strip, live current-time indicator, and overlap-aware event layout. Click any hour to create an event at that time
- **Event editor** with title, date, all-day toggle, start/end times, 8 categories, pin-to-sidebar, description, and **recurrence** (daily / weekly / monthly / yearly with optional end date)
- **File attachments** on events and sticky notes, kept as Blobs in IndexedDB, with drag-and-drop
- **Sticky notes** in the sidebar with 4 colors, per-note attachments, and reordering by dragging the grip handle or by keyboard (focus a handle, <kbd>Space</kbd>, arrow keys, <kbd>Space</kbd>)
- **Pinned-events list** in the sidebar, click to jump to the day
- **JSON export / import** for portable backup, with validation on the way in
- **Toast undo** on event and note delete
- **Keyboard shortcuts**: `←` / `→` (prev/next month), `T` (today), `N` (new event), `Esc` (close modal). They stay out of the way while you are typing
- **URL routing** — `/calendar`, `/calendar/YYYY/MM`, and `/day/YYYY-MM-DD` all work as deep links and respond to back/forward
- **Dark mode**, following your OS setting
- **Recoverable errors** — a bad link or an unexpected failure shows an explanation with a way back, rather than a blank page

## Running locally

Requires Node 18+ (any version compatible with Vite 5).

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # produces dist/index.html (single-file bundle, ~376 KB)
npm run preview    # serve the built bundle
npm test           # run the unit tests once
npm run test:watch # re-run on change
```

## Distributing without Node

`npm run build` produces a single `dist/index.html` that contains all JS and CSS inlined. The app uses `HashRouter`, so the file works directly from `file://` — users can double-click it and the calendar opens in their default browser. No install, no server, no Node.

Send the file by email, USB, intranet share, or host it on any static host.

IndexedDB and `crypto.randomUUID()` were both verified working from `file://` in Chromium, so storage and id generation behave the same as when served over HTTP.

### Caveats

- **Per-browser, per-origin storage.** Each browser keeps its own IndexedDB database. If a user opens the file in Chrome today and Edge tomorrow, they will see two empty calendars — pick one browser and stick with it.
- **Moving the file can orphan data** in some browsers because storage is keyed off the path. Save the file somewhere stable (Desktop, Documents) and don't shuffle it around.
- **The HTML file is the app, not the data.** Use the **Export** button periodically to save a JSON backup of events, notes, and attachments.
- **Private/incognito windows** often refuse IndexedDB entirely. The app detects this and says so on screen rather than pretending to save your work.

## Persistence

- **Database**: IndexedDB via [Dexie](https://dexie.org), name `my-calendar-db`, schema version 2
- **Tables**: `events`, `notes`, `attachments`
- Survives browser restarts and reloads, tied to the browser+origin
- Clearing site data wipes everything; no cloud backup. Use Export.

### Backup format

Export writes a versioned JSON file containing every event, note, and attachment (attachments base64-encoded inline, so the file is self-contained).

Import **merges** by id rather than replacing — importing never deletes rows the file doesn't mention, and a row with a matching id is updated. Files are validated before anything is written: a file that isn't a backup, or that came from a newer version of the app, is rejected outright with a message. Individual malformed rows are skipped and counted rather than written into the database, and the toast tells you how many were dropped.

## Testing

`npm test` runs the unit suite (Vitest, with `fake-indexeddb` standing in for the browser's IndexedDB). It covers the logic where the real defects lived:

- **Date handling** — the ISO round-trip invariant that a day-cell click depends on, plus DST boundaries
- **Recurrence** — anchor stability for monthly/yearly series, phase-locking for weekly, long-running series, `recurrenceEnd`, and range edges
- **Event layout** — column packing for overlapping events, minimum heights, malformed times
- **Backup** — base64 round-trip for binary data, per-row import validation, merge semantics, and a full export → import → verify cycle

The date tests are deliberately not pinned to a timezone: they assert invariants that must hold everywhere, and the suite passes identically from UTC+14 to UTC-11.

There is no linter configured. `npm run build` runs `tsc -b` first, so type errors fail the build.

## Known limits

- **Per-occurrence recurrence edits are not supported** — editing or deleting any occurrence of a recurring event changes the whole series. The editor says so, and deleting a series takes a deliberate second click.
- **Monthly series clamp to the last day of shorter months.** A monthly event on the 31st shows on Feb 28 (or Feb 29), then returns to the 31st in March. It never drifts and always fires once per month.
- **No reminders, notifications, time zones, or sharing.** Everything is stored and displayed in whatever timezone the browser is currently in.
- **Single-user, single-browser** — no sync across devices.
- **Attachments are added after an event exists.** Save a new event, reopen it, then attach.
- **A single attachment over roughly 384 MB cannot be included in a backup.** Base64 encoding hits the browser's maximum string length. Export refuses and names the file rather than writing a backup with the payload silently missing — but that attachment is then only as safe as the browser profile holding it.
- **Exporting a very large database is slow and holds the data in memory** while it encodes. It stays responsive between files, but a multi-hundred-megabyte export will take a while.
- **Editing a note is saved shortly after you stop typing**, or immediately when you click away. Closing the tab mid-keystroke without leaving the field can drop the last fragment.
- **Week view, search, and month drag-to-move are not implemented.**

## License

See [LICENSE](./LICENSE).
