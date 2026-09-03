import { useEffect, useState } from 'react';
import type { Attachment } from '../../types';
import { deleteAttachment } from '../../db/queries';
import styles from './AttachmentRow.module.css';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(attachment.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment.data]);

  return (
    <div className={styles.row}>
      {attachment.mimeType.startsWith('image/') && url && (
        <img className={styles.thumb} src={url} alt="" />
      )}
      <span className={styles.name} title={attachment.name}>{attachment.name}</span>
      <span className={styles.size}>{formatFileSize(attachment.size)}</span>
      {url && (
        <a className={styles.download} href={url} download={attachment.name}>Download</a>
      )}
      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${attachment.name}`}
        onClick={() => void deleteAttachment(attachment.id)}
      >
        ✕
      </button>
    </div>
  );
}
