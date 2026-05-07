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

## Commands

```sh
npm install
npm run dev       # Vite dev server on :5173
npm run build     # tsc -b && vite build → single dist/index.html
npm run preview   # serve the built bundle
```

There is no test suite or linter configured. Verify changes with `npm run build` (it runs `tsc -b` first, so type errors fail the build).

## Architecture

### Directory layout

```
src/
  App.tsx                 Router, route definitions, mounts MainPanel
  main.tsx                React root, imports global CSS
  components/
    AppShell/             Sidebar + main layout grid
    CalendarHeader/       Month nav, Today, Add Event, sidebar toggle
    DayView/              24h timeline + all-day strip
    MonthView/            7-col grid, DayCell, EventChip
    EventModal/           Add/edit event dialog (portal)
    Sidebar/              Sticky notes, pinned events, Export/Import
    Toaster/              Toast notifications (undo, status)
    shared/               AttachmentZone, AttachmentRow
  db/
    db.ts                 Dexie schema (version 2)
    queries.ts            CRUD + live-query hooks + snapshot helpers
  store/
    useStore.ts           UI/route state (Zustand)
    useToasts.ts          Toast queue
  styles/
    variables.css         CSS custom properties (theme + category palette)
    global.css            Resets + [data-category] color rules
  types/index.ts          Shared types (CalendarEvent, StickyNote, Attachment, etc.)
  utils/
    backup.ts             JSON export/import
    colors.ts             NOTE_COLORS map (event categories live in CSS)
    dateHelpers.ts        toISODate, monthRange
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

### Persistence

`src/db/db.ts` defines schema **version 2** (v1 indexed `pinned`, which doesn't work because IndexedDB can't index booleans; v2 dropped it and queries use `db.events.filter(e => e.pinned)`). When changing the schema, bump the version number and add a `.upgrade()` block if data shape changes.

Soft-deletes are not used. `deleteEvent` and `deleteNote` are hard deletes inside transactions that also drop linked attachments. Undo is implemented via snapshot helpers (`deleteEventWithSnapshot`, `deleteNoteWithSnapshot`) that capture the row + attachments, perform the delete, and return a `restore()` callback. Callers push a toast with that callback as the action.

### Recurrence

A recurring event is one row with `recurrence` and optional `recurrenceEnd`. Queries fetch all events with `date <= rangeEnd`, then `expandRecurring` (`utils/recurrence.ts`) fans them into one virtual `CalendarEvent` per occurrence inside `[rangeStart, rangeEnd]`. The expanded occurrences share the original row's `id`, so clicking any occurrence opens the series in the modal — there is no per-occurrence override mechanism. If you ever add one, the schema needs an `overrides` map keyed by ISO date and the expander needs to apply it.

### Categories

Event category colors live in `styles/variables.css` as CSS custom properties (`--cat-work-bg`, `--cat-work-fg`, …) and are applied via the global selector `[data-category="work"]` in `styles/global.css`. To add a category: extend `EventCategory` in `types/index.ts`, add the var pair, add the global selector, and add the value to the `categories` array in `EventModal.tsx`.

Note colors still live in `utils/colors.ts` (`NOTE_COLORS`) because the sticky-note swatches use them inline. That's fine — don't refactor for parity unless you have a reason.

## Conventions

- **One source of truth**: URL for view state; Dexie for data; Zustand only for UI state that doesn't belong in either.
- **Prefer Edit over Write** for existing files; only Write for new files or full rewrites.
- **No comments** unless the *why* is non-obvious. Don't restate what the code does.
- **No new top-level files** (test config, lint config, etc.) without asking.
- **Keep the bundle small.** Every dep ends up inlined in `dist/index.html`.

## Distribution model

The product is `dist/index.html`. Users without Node double-click the file and the app runs from `file://`. Two consequences worth keeping in mind:

1. **`HashRouter` is required** — `BrowserRouter` does not work over `file://`.
2. **No relative fetches, no separate asset files.** `vite-plugin-singlefile` inlines JS and CSS; if you add assets that don't get inlined (large binaries, fonts loaded from network), the file:// build will break.

## Things to verify when changing core code

- `npm run build` succeeds (this runs `tsc -b` first).
- After router or RouteSync changes, deep-link to `/day/2026-10-15` and `/calendar/2026/10`, then use back/forward.
- After Dexie schema changes, bump the version number; existing users have v1+ data.
- After modal/sidebar layout changes, sanity-check `<700px` (the sidebar drawer).
