import { useMemo } from 'react';
import type { NoteColor, StickyNote as StickyNoteType } from '../../types';
import { deleteNoteWithSnapshot, updateNote } from '../../db/queries';
import { useToasts } from '../../store/useToasts';
import { NOTE_COLORS } from '../../utils/colors';
import { AttachmentZone } from '../shared/AttachmentZone';
import styles from './StickyNote.module.css';

const COLORS: NoteColor[] = ['yellow', 'blue', 'green', 'pink'];

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...(args as never[])), wait);
  };
}

export function StickyNote({ note }: { note: StickyNoteType }) {
  const onChange = useMemo(() => debounce((content: string) => void updateNote(note.id, { content }), 500), [note.id]);
  const pushToast = useToasts((s) => s.push);

  const handleDelete = async () => {
    const restore = await deleteNoteWithSnapshot(note.id);
    if (restore) {
      pushToast({
        message: 'Note deleted',
        action: { label: 'Undo', onClick: () => void restore() },
      });
    }
  };

  return (
    <article className={styles.note} style={{ background: NOTE_COLORS[note.color].bg, color: NOTE_COLORS[note.color].text }}>
      <div className={styles.row}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={styles.swatch}
            style={{ background: NOTE_COLORS[c].bg }}
            onClick={() => void updateNote(note.id, { color: c })}
            aria-label={`Set ${c} color`}
          />
        ))}
        <button className={styles.delete} onClick={() => void handleDelete()} aria-label="Delete note">✕</button>
      </div>
      <textarea
        className={styles.text}
        defaultValue={note.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type a note…"
      />
      <AttachmentZone noteId={note.id} />
    </article>
  );
}
