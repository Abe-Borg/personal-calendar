import { useMemo } from 'react';
import type { NoteColor, StickyNote as StickyNoteType } from '../../types';
import { deleteNote, updateNote } from '../../db/queries';
import { NOTE_COLORS } from '../../utils/colors';
import { AttachmentZone } from '../shared/AttachmentZone';

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...(args as never[])), wait);
  };
}

export function StickyNote({ note }: { note: StickyNoteType }) {
  const onChange = useMemo(() => debounce((content: string) => void updateNote(note.id, { content }), 500), [note.id]);
  return (
    <article style={{ background: NOTE_COLORS[note.color].bg, padding: 8, borderRadius: 8 }}>
      <div>
        {(['yellow', 'blue', 'green', 'pink'] as NoteColor[]).map((c) =>
          <button key={c} style={{ background: NOTE_COLORS[c].bg }} onClick={() => void updateNote(note.id, { color: c })} aria-label={`Set ${c} color`} />,
        )}
        <button onClick={() => void deleteNote(note.id)}>✕</button>
      </div>
      <textarea defaultValue={note.content} onChange={(e) => onChange(e.target.value)} />
      <AttachmentZone noteId={note.id} />
    </article>
  );
}
