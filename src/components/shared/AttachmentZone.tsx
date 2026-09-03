import { useRef, useState } from 'react';
import { addAttachment, useAttachmentsForEvent, useAttachmentsForNote } from '../../db/queries';
import { useToasts } from '../../store/useToasts';
import { AttachmentRow } from './AttachmentRow';
import styles from './AttachmentZone.module.css';

export function AttachmentZone({ eventId, noteId }: { eventId?: string; noteId?: string }) {
  // Both hooks run unconditionally; selecting between them with a ternary was a
  // Rules-of-Hooks violation that only worked because the props never swap.
  const eventAttachments = useAttachmentsForEvent(eventId);
  const noteAttachments = useAttachmentsForNote(noteId);
  const attachments = eventId ? eventAttachments : noteAttachments;
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pushToast = useToasts((s) => s.push);

  if (!eventId && !noteId) return null;
  const target = eventId ? ({ eventId } as const) : ({ noteId: noteId! } as const);

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      try {
        await addAttachment(file, target);
      } catch (err) {
        // Usually the storage quota. Failing silently leaves the user believing
        // the document is attached when it is not.
        pushToast({ message: `Could not attach "${file.name}": ${(err as Error).message}` });
      }
    }
  }

  return (
    <div
      className={styles.zone}
      data-dragging={dragging}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      {/* A <label> wrapping a hidden input is not focusable, which put the only
          way to add an attachment out of reach of the keyboard entirely. */}
      <button type="button" className={styles.trigger} onClick={() => inputRef.current?.click()}>
        + Attach file
      </button>
      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {attachments && attachments.length > 0 && (
        <div className={styles.list}>
          {attachments.map((a) => <AttachmentRow key={a.id} attachment={a} />)}
        </div>
      )}
    </div>
  );
}
