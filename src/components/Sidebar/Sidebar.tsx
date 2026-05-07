import { useRef } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import useStore from '../../store/useStore';
import { useToasts } from '../../store/useToasts';
import { addNote, reorderNotes, useNotes, usePinnedEvents } from '../../db/queries';
import { exportToJson, importFromJson, downloadJson } from '../../utils/backup';
import { useCalendarNav } from '../../utils/navigation';
import { StickyNote } from './StickyNote';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const openEditModal = useStore((s) => s.openEditModal);
  const pushToast = useToasts((s) => s.push);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const nav = useCalendarNav();
  const notes = useNotes() ?? [];
  const pinned = usePinnedEvents() ?? [];
  const sorted = [...notes].sort((a, b) => a.order - b.order);

  const handleExport = async () => {
    const json = await exportToJson();
    downloadJson(json, `calendar-${new Date().toISOString().slice(0, 10)}.json`);
    pushToast({ message: 'Exported calendar' });
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = await importFromJson(text);
      pushToast({ message: `Imported ${result.events} events, ${result.notes} notes, ${result.attachments} attachments` });
    } catch (err) {
      pushToast({ message: `Import failed: ${(err as Error).message}` });
    }
  };

  return (
    <aside className={styles.sidebar} data-open={sidebarOpen}>
      <div className={styles.toolbar}>
        <button onClick={() => void addNote({ content: '', color: 'yellow', pinned: false })}>+ Note</button>
        <button onClick={() => void handleExport()}>Export</button>
        <label>
          Import
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          const oldIndex = sorted.findIndex((n) => n.id === active.id);
          const newIndex = sorted.findIndex((n) => n.id === over.id);
          const reordered = arrayMove(sorted, oldIndex, newIndex);
          void reorderNotes(reordered.map((n) => n.id));
        }}
      >
        <SortableContext items={sorted.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.notes}>{sorted.map((n) => <StickyNote key={n.id} note={n} />)}</div>
        </SortableContext>
      </DndContext>
      <div className={styles.section}>Pinned events</div>
      {pinned.length === 0 ? (
        <div className={styles.empty}>None pinned yet</div>
      ) : (
        <ul className={styles.pinnedList}>
          {pinned.map((e) => (
            <li
              key={e.id}
              className={styles.pinnedItem}
              data-category={e.category}
              onClick={() => {
                const d = new Date(e.date);
                nav.goToDay(d);
                openEditModal(e.id);
              }}
            >
              {e.title}
              <span className={styles.pinnedDate}>{e.date}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
