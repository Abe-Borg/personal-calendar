import { useEffect, useMemo, useRef } from 'react';
import { NOTE_COLOR_NAMES, type StickyNote as StickyNoteType } from '../../types';
import { deleteNoteWithSnapshot, updateNote } from '../../db/queries';
import { useToasts } from '../../store/useToasts';
import { NOTE_COLORS } from '../../utils/colors';
import { AttachmentZone } from '../shared/AttachmentZone';
import styles from './StickyNote.module.css';

const SAVE_DELAY_MS = 500;

export function StickyNote({ note }: { note: StickyNoteType }) {
  const pushToast = useToasts((s) => s.push);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<string | null>(null);

  const save = useMemo(
    () => (content: string) => {
      pending.current = content;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        pending.current = null;
        void updateNote(note.id, { content });
      }, SAVE_DELAY_MS);
    },
    [note.id],
  );

  // Without this, unmounting mid-debounce (reorder, sidebar close, refresh)
  // silently discards the last half-second of typing.
  useEffect(() => {
    const id = note.id;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null) {
        void updateNote(id, { content: pending.current });
        pending.current = null;
      }
    };
  }, [note.id]);

  const handleDelete = async () => {
    const restore = await deleteNoteWithSnapshot(note.id);
    if (restore) {
      pushToast({ message: 'Note deleted', action: { label: 'Undo', onClick: () => void restore() } });
    }
  };

  return (
    <article
      className={styles.note}
      style={{ background: NOTE_COLORS[note.color].bg, color: NOTE_COLORS[note.color].text }}
    >
      <div className={styles.row}>
        {NOTE_COLOR_NAMES.map((c) => (
          <button
            type="button"
            key={c}
            className={styles.swatch}
            data-active={note.color === c}
            style={{ background: NOTE_COLORS[c].bg }}
            onClick={() => void updateNote(note.id, { color: c })}
            aria-label={`Make this note ${c}`}
            aria-pressed={note.color === c}
          />
        ))}
        <button type="button" className={styles.delete} onClick={() => void handleDelete()} aria-label="Delete note">
          ✕
        </button>
      </div>
      <textarea
        className={styles.text}
        defaultValue={note.content}
        onChange={(e) => save(e.target.value)}
        aria-label="Note text"
        placeholder="Type a note…"
      />
      <AttachmentZone noteId={note.id} />
    </article>
  );
}
