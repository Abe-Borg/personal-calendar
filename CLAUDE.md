# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A local-first personal calendar SPA. Vite + React 18 + TypeScript. All state lives in the browser; there is no backend, no auth, no server-side anything.

## Tech stack

- **Build**: Vite 5, `vite-plugin-singlefile` so `npm run build` produces one inlined `dist/index.html`
- **Framework**: React 18 (StrictMode), TypeScript strict
- **Routing**: `react-router-dom` v6, `HashRouter` (chosen so the bundle works from `file://`)
- **State**: Zustand (`src/store/useStore.ts` for UI/route state, `src/store/useToasts.ts` for toasts)
- **Persistence**: IndexedDB via Dexie (`src/db/db.ts`), live queries via `dexie-react-hooks`
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable` for sticky-note reordering
- **Dates**: `date-fns`
- **Tests**: Vitest + `fake-indexeddb` (dev dependencies only — they never reach the bundle)

## Commands

```sh
npm install
npm run dev       # Vite dev server on :5173
npm run build     # tsc -b && vite build → single dist/index.html
npm run preview   # serve the built bundle
npm test          # vitest run
```

There is no linter configured. Verify changes with `npm run build` (it runs `tsc -b` first, so type errors fail the build) **and** `npm test`.

Vitest config lives inside `vite.config.ts` rather than a separate file, to honour the no-new-top-level-files rule below. Tests are `src/**/*.test.ts` and are type-checked by `tsc -b` along with everything else.

## Architecture

### Directory layout

```
src/
  App.tsx                 Router, route definitions, mounts MainPanel
  main.tsx                React root, imports global CSS
  components/
    AppShell/             Sidebar + main layout grid, storage-failure screen, ErrorBoundary
    CalendarHeader/       Month nav, Today, Add Event, sidebar toggle
    DayView/              24h timeline + all-day strip, click-an-hour to create
    MonthView/            7-col grid, DayCell, EventChip
    EventModal/           Add/edit event dialog (portal, focus-trapped)
    Sidebar/              Sticky notes, pinned events, Export/Import
    Toaster/              Toast notifications (undo, status)
    shared/               AttachmentZone, AttachmentRow
  db/
    db.ts                 Dexie schema (version 2) + openDatabase()
    queries.ts            CRUD + live-query hooks + snapshot helpers
  store/
    useStore.ts           UI/route state (Zustand)
    useToasts.ts          Toast queue
  styles/
    variables.css         CSS custom properties (theme + category palette, light and dark)
    global.css            Resets + [data-category] color rules
  types/index.ts          Shared types + the const arrays they derive from
  utils/
    backup.ts             JSON export/import with per-row validation
    colors.ts             NOTE_COLORS map (event categories live in CSS)
    dateHelpers.ts        toISODate, fromISODate, todayISO, monthRange, validators
    eventLayout.ts        Overlap-aware day-view event layout
    navigation.ts         useCalendarNav (URL navigation only)
    recurrence.ts         expandRecurring(events, rangeStart, rangeEnd)
    RouteSync.tsx         Watches location, drives the store
    useKeyboardShortcuts.ts
```

### State and routing

The URL is the source of truth for view state. `RouteSync` (in `App.tsx`, inside `HashRouter`) watches `useLocation().pathname`, parses `/day/YYYY-MM-DD` and `/calendar/YYYY/MM`, and calls `setRouteState` on the store. Bare `/calendar` resets to today's month.

All navigation goes through `useCalendarNav` (`utils/navigation.ts`), which only emits `navigate()` calls — it never mutates the store directly. The store is downstream of the URL.

When adding new view states, follow the same pattern: route → RouteSync → store. Don't add store-mutating navigation actions.

### Dates — read this before touching any date code

Every date in this app is a date-only `yyyy-MM-dd` string. **`new Date('2026-10-15')` parses as UTC midnight**, which formats back as `2026-10-14` in any negative UTC offset. That single mistake broke every day-cell click in the app for months.

Rules:

- Parse date-only strings with `fromISODate` (`utils/dateHelpers.ts`), never `new Date(...)`.
- Format with `toISODate`, never `.toISOString().slice(0, 10)`.
- `useCalendarNav().goToDay` takes an **ISO string**, not a `Date`, so the lossy round-trip can't come back.
- Construct "today" with `todayISO()` at call time, not once at module scope.
- **Validate before you store.** A route can match `\d{4}-\d{2}-\d{2}` and still be an impossible date (`/day/2026-02-30`). `RouteSync` gates on `isISODate` for exactly this reason: formatting an Invalid Date throws during render, which used to unmount the whole React root and leave a blank page that navigation could not recover.
- Date tests must pass in every timezone. Assert invariants, don't pin `TZ`. The suite is checked from UTC+14 to UTC-11.

### Live queries return the *previous* result while a new one loads

`useLiveQuery` keeps returning the last key's value until the new query resolves, so `value === undefined` is **not** a reliable "still loading" test once anything has been loaded. Test identity instead — `existing?.id !== modalEventId`. `EventModal` additionally refuses to render a submittable form during that window: an 18ms gap where the fields still held the previously opened event was enough to overwrite one event's row with another's on save.

### Render failures

`ErrorBoundary` wraps the routed content in `App.tsx`. Without it, one throw inside a view unmounts the entire root and leaves a blank page that only a full reload recovers. Prefer fixing the throw, but keep the boundary: it turns a dead tab into a recoverable message.

### Persistence

`src/db/db.ts` defines schema **version 2** (v1 indexed `pinned`, which doesn't work because IndexedDB can't index booleans; v2 dropped it and queries use `db.events.filter(e => e.pinned)`). When changing the schema, bump the version number and add a `.upgrade()` block if data shape changes.

`openDatabase()` returns an error string instead of throwing, and `AppShell` renders a dedicated failure screen. IndexedDB is genuinely unavailable in some private-browsing modes; without this the app silently discards everything typed into it.

Soft-deletes are not used. `deleteEvent` and `deleteNote` are hard deletes inside transactions that also drop linked attachments. Undo is implemented via snapshot helpers (`deleteEventWithSnapshot`, `deleteNoteWithSnapshot`) that capture the row + attachments, perform the delete, and return a `restore()` callback. Callers push a toast with that callback as the action. Restores use `put`, not `add`, so undo still works if the user re-created the row first.

### Backup

`utils/backup.ts` owns export/import. It uses `Blob.arrayBuffer()` + `btoa`, **not `FileReader`** — FileReader is browser-only and made the only backup path in a local-first app untestable.

Import validates before it writes: version gate, then `parseEvent` / `parseNote` / `parseAttachment` per row, skipping and counting anything malformed. Never `bulkPut` straight from `JSON.parse`. If you add a field to a stored type, add it to the matching parser or it will be silently dropped on restore.

### Recurrence

A recurring event is one row with `recurrence` and optional `recurrenceEnd`. Queries fetch all events with `date <= rangeEnd`, then `expandRecurring` (`utils/recurrence.ts`) fans them into one virtual `CalendarEvent` per occurrence inside `[rangeStart, rangeEnd]`.

Two invariants hold the implementation together:

1. **Occurrence `i` is derived from the anchor**, never from the previously emitted date. Stepping off the previous date lets a clamped month (Jan 31 → Feb 28) drag the series permanently backwards.
2. **The expander seeks to the range** instead of walking from the series start, so cost is O(occurrences in range) and a decades-old daily series still renders. The occurrence cap bounds output, not the walk.

The expanded occurrences share the original row's `id`, so clicking any occurrence opens the series in the modal — there is no per-occurrence override mechanism. If you ever add one, the schema needs an `overrides` map keyed by ISO date and the expander needs to apply it.

### Categories

Category names live in one place: `EVENT_CATEGORIES` in `types/index.ts`, with `EventCategory` derived from it. The modal renders from that array and `backup.ts` validates against it.

Colors live in `styles/variables.css` as CSS custom properties (`--cat-work-bg`, `--cat-work-fg`, …) and are applied via the global selector `[data-category="work"]` in `styles/global.css`. The `[data-category]` rules are declared **after** the button reset so they win on chip buttons.

To add a category: add the value to `EVENT_CATEGORIES`, add the var pair in **both** the light and dark blocks of `variables.css`, and add the global selector. Nothing else needs touching.

Note colors still live in `utils/colors.ts` (`NOTE_COLORS`) because the sticky-note swatches use them inline. That's fine — don't refactor for parity unless you have a reason.

## Conventions

- **One source of truth**: URL for view state; Dexie for data; Zustand only for UI state that doesn't belong in either.
- **Prefer Edit over Write** for existing files; only Write for new files or full rewrites.
- **No comments** unless the *why* is non-obvious. Don't restate what the code does.
- **No new top-level files** (test config, lint config, etc.) without asking.
- **Keep the bundle small.** Every runtime dep ends up inlined in `dist/index.html`. Dev dependencies are free.
- **Subscribe to Zustand with selectors** (`useStore((s) => s.thing)`), not by destructuring the whole store — the latter re-renders the component on every unrelated change.

## Distribution model

The product is `dist/index.html`. Users without Node double-click the file and the app runs from `file://`. Consequences worth keeping in mind:

1. **`HashRouter` is required** — `BrowserRouter` does not work over `file://`.
2. **No relative fetches, no separate asset files.** `vite-plugin-singlefile` inlines JS and CSS; if you add assets that don't get inlined (large binaries, fonts loaded from network), the file:// build will break. The favicon is an inline `data:` SVG for exactly this reason.
3. **IndexedDB and `crypto.randomUUID()` do work from `file://`** in Chromium — verified, not assumed. Don't add a fallback for them without evidence they're needed.

## Things to verify when changing core code

- `npm run build` succeeds (this runs `tsc -b` first).
- `npm test` passes.
- After date changes, confirm the suite still passes under several timezones, e.g. `TZ=Pacific/Kiritimati npx vitest run` and `TZ=Pacific/Midway npx vitest run`.
- After router or RouteSync changes, deep-link to `/day/2026-10-15` and `/calendar/2026/10`, then use back/forward. Also try `/day/2026-02-30` and `/calendar/2026/47`: shape-valid nonsense must fall back to the current month, not throw.
- After Dexie schema changes, bump the version number; existing users have v1+ data.
- After modal/sidebar layout changes, sanity-check `<700px` (the sidebar drawer).
- Before shipping, open the built `dist/index.html` from `file://` and click through it. Every defect this project has had was an interaction defect that type-checked fine.
