import { addAttachment, useAttachmentsForEvent, useAttachmentsForNote } from '../../db/queries';
import { AttachmentRow } from './AttachmentRow';

export function AttachmentZone({ eventId, noteId }: { eventId?: string; noteId?: string }) {
  const attachments = eventId ? useAttachmentsForEvent(eventId) : useAttachmentsForNote(noteId!);
  const target = eventId ? ({ eventId } as const) : ({ noteId: noteId! } as const);

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) await addAttachment(file, target);
  }

  return (
    <div onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()}>
      <label>
        + Attach
        <input hidden multiple type="file" onChange={(e) => e.target.files && void handleFiles(e.target.files)} />
      </label>
      <div>{attachments?.map((a) => <AttachmentRow key={a.id} attachment={a} />)}</div>
    </div>
  );
}
