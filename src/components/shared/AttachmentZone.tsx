import { useId, useState } from 'react';
import { addAttachment, useAttachmentsForEvent, useAttachmentsForNote } from '../../db/queries';
import { AttachmentRow } from './AttachmentRow';
import styles from './AttachmentZone.module.css';

export function AttachmentZone({ eventId, noteId }: { eventId?: string; noteId?: string }) {
  // Both hooks run unconditionally; selecting between them with a ternary was a
  // Rules-of-Hooks violation that only worked because the props never swap.
  const eventAttachments = useAttachmentsForEvent(eventId);
  const noteAttachments = useAttachmentsForNote(noteId);
  const attachments = eventId ? eventAttachments : noteAttachments;
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  if (!eventId && !noteId) return null;
  const target = eventId ? ({ eventId } as const) : ({ noteId: noteId! } as const);

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) await addAttachment(file, target);
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
      <label className={styles.trigger} htmlFor={inputId}>+ Attach file</label>
      <input
        id={inputId}
        hidden
        multiple
        type="file"
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
