import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import useStore from '../../store/useStore';
import { addNote, reorderNotes, useNotes, usePinnedEvents } from '../../db/queries';
import { StickyNote } from './StickyNote';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const notes = useNotes() ?? [];
  const pinned = usePinnedEvents() ?? [];
  const sorted = [...notes].sort((a, b) => a.order - b.order);

  return (
    <aside className={styles.sidebar}>
      <button onClick={toggleSidebar} className={styles.toggle} aria-label="Toggle sidebar">☰</button>
      <button onClick={() => void addNote({ content: '', color: 'yellow', pinned: false })}>+ Note</button>
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
      <h4>Pinned events</h4>
      <ul>{pinned.map((e) => <li key={e.id}>{e.title}</li>)}</ul>
    </aside>
  );
}
