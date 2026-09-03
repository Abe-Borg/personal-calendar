import { useCallback, useEffect, useRef } from 'react';
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

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
    if (pending.current === null) return;
    const content = pending.current;
    pending.current = null;
    void updateNote(note.id, { content });
  }, [note.id]);

  const save = useCallback(
    (content: string) => {
      pending.current = content;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  // A pending debounce is lost if the component goes away or the page does.
  // Unmount covers reorder and delete; blur and pagehide cover the window where
  // a user types and immediately reloads or closes the tab.
  useEffect(() => flush, [flush]);

  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

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
        onBlur={flush}
        aria-label="Note text"
        placeholder="Type a note…"
      />
      <AttachmentZone noteId={note.id} />
    </article>
  );
}
