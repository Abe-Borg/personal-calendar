import { useEffect } from 'react';
import { useToasts, type Toast } from '../../store/useToasts';
import styles from './Toaster.module.css';

const TOAST_TIMEOUT_MS = 6000;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), TOAST_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);
  return (
    <div className={styles.toast} role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button onClick={() => { toast.action!.onClick(); dismiss(toast.id); }}>
          {toast.action.label}
        </button>
      )}
      <button className={styles.dismiss} aria-label="Dismiss" onClick={() => dismiss(toast.id)}>×</button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className={styles.toaster} aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
