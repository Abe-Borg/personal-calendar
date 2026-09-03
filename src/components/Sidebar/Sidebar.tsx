import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import useStore from '../../store/useStore';
import { useToasts } from '../../store/useToasts';
import { addNote, reorderNotes, useNotes, usePinnedEvents } from '../../db/queries';
import { ImportError, exportToJson, importFromJson, downloadJson } from '../../utils/backup';
import { useCalendarNav } from '../../utils/navigation';
import { todayISO } from '../../utils/dateHelpers';
import { StickyNote } from './StickyNote';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const openEditModal = useStore((s) => s.openEditModal);
  const pushToast = useToasts((s) => s.push);
  const nav = useCalendarNav();
  const notes = useNotes() ?? [];
  const pinned = usePinnedEvents() ?? [];
  const sorted = [...notes].sort((a, b) => a.order - b.order);
  // The distance constraint keeps a plain click on the handle from starting a
  // drag; the keyboard sensor makes reordering reachable without a pointer.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleExport = async () => {
    try {
      downloadJson(await exportToJson(), `calendar-${todayISO()}.json`);
      pushToast({ message: 'Backup downloaded' });
    } catch (err) {
      pushToast({ message: `Export failed: ${(err as Error).message}` });
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const result = await importFromJson(await file.text());
      const skipped = result.skipped ? `, skipped ${result.skipped} bad row${result.skipped === 1 ? '' : 's'}` : '';
      pushToast({
        message: `Imported ${result.events} events, ${result.notes} notes, ${result.attachments} attachments${skipped}`,
      });
    } catch (err) {
      pushToast({
        message: err instanceof ImportError ? err.message : `Import failed: ${(err as Error).message}`,
      });
    }
  };

  return (
    <aside className={styles.sidebar} data-open={sidebarOpen} aria-label="Notes and pinned events">
      <div className={styles.toolbar}>
        <button type="button" onClick={() => void addNote({ content: '', color: 'yellow', pinned: false })}>
          + Note
        </button>
        <button type="button" onClick={() => void handleExport()}>Export</button>
        <label className={styles.importLabel}>
          Import
          <input
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </label>
        <button type="button" className={styles.closeDrawer} onClick={toggleSidebar} aria-label="Close sidebar">
          ✕
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          const oldIndex = sorted.findIndex((n) => n.id === active.id);
          const newIndex = sorted.findIndex((n) => n.id === over.id);
          if (oldIndex === -1 || newIndex === -1) return;
          void reorderNotes(arrayMove(sorted, oldIndex, newIndex).map((n) => n.id));
        }}
      >
        <SortableContext items={sorted.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.notes}>
            {sorted.length === 0
              ? <p className={styles.empty}>No notes yet. Hit “+ Note”.</p>
              : sorted.map((n) => <StickyNote key={n.id} note={n} />)}
          </div>
        </SortableContext>
      </DndContext>

      <div className={styles.section}>Pinned events</div>
      {pinned.length === 0 ? (
        <p className={styles.empty}>Tick “Pin to sidebar” on an event to keep it here.</p>
      ) : (
        <ul className={styles.pinnedList}>
          {pinned.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={styles.pinnedItem}
                data-category={e.category}
                onClick={() => { nav.goToDay(e.date); openEditModal(e.id); }}
              >
                <span className={styles.pinnedTitle}>{e.title}</span>
                <span className={styles.pinnedDate}>{e.date}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
