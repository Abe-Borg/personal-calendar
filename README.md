# Personal Calendar

A local-first personal calendar that runs entirely in the browser. No server, no account, no cloud — events, sticky notes, and file attachments live in IndexedDB on your own machine.

## What it does

- **Month view** with category-colored event chips (up to 3 per day + "+N more")
- **Day view** with a 24-hour timeline, all-day strip, current-time indicator, and overlap-aware event layout
- **Event editor** with title, date, all-day toggle, start/end times, 8 categories, pin-to-sidebar, description, and **recurrence** (daily / weekly / monthly / yearly with optional end date)
- **File attachments** on events and sticky notes (any size, kept as Blobs in IndexedDB)
- **Sticky notes** in the sidebar with 4 colors, drag-to-reorder, and per-note attachments
- **Pinned-events list** in the sidebar, click to jump to the day
- **JSON export / import** for portable backup
- **Toast undo** on event and note delete
- **Keyboard shortcuts**: `←` / `→` (prev/next month), `T` (today), `N` (new event today), `Esc` (close modal)
- **URL routing** — `/calendar`, `/calendar/YYYY/MM`, and `/day/YYYY-MM-DD` all work as deep links and respond to back/forward

## Running locally

Requires Node 18+ (any version compatible with Vite 5).

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # produces dist/index.html (single-file bundle, ~360 KB)
npm run preview  # serve the built bundle
```

## Distributing without Node

`npm run build` produces a single `dist/index.html` that contains all JS and CSS inlined. The app uses `HashRouter`, so the file works directly from `file://` — users can double-click it and the calendar opens in their default browser. No install, no server, no Node.

Send the file by email, USB, intranet share, or host it on any static host.

### Caveats

- **Per-browser, per-origin storage.** Each browser keeps its own IndexedDB database. If a user opens the file in Chrome today and Edge tomorrow, they will see two empty calendars — pick one browser and stick with it.
- **Moving the file can orphan data** in some browsers because storage is keyed off the path. Save the file somewhere stable (Desktop, Documents) and don't shuffle it around.
- **The HTML file is the app, not the data.** Use the **Export** button periodically to save a JSON backup of events, notes, and attachments.

## Persistence

- **Database**: IndexedDB via [Dexie](https://dexie.org), name `my-calendar-db`, schema version 2
- **Tables**: `events`, `notes`, `attachments`
- Survives browser restarts and reloads, tied to the browser+origin
- Clearing site data wipes everything; no cloud backup. Use Export.

## Known limits

- **Per-occurrence recurrence edits are not supported** — editing any occurrence of a recurring event edits the whole series
- **No reminders, notifications, time zones, or sharing**
- **Single-user, single-browser** — no sync across devices

## License

See [LICENSE](./LICENSE).
