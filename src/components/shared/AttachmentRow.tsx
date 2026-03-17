import { useEffect, useState } from 'react';
import type { Attachment } from '../../types';
import { deleteAttachment } from '../../db/queries';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(attachment.data);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [attachment.data]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
      {attachment.mimeType.startsWith('image/') && url && <img src={url} alt={attachment.name} style={{ width: 26, height: 26, objectFit: 'cover' }} />}
      <span>{attachment.name}</span><span>{formatFileSize(attachment.size)}</span>
      {url && <a href={url} download={attachment.name}>Download</a>}
      <button onClick={() => deleteAttachment(attachment.id)}>✕</button>
    </div>
  );
}
