import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import useStore from '../../store/useStore';
import { useToasts } from '../../store/useToasts';
import { db } from '../../db/db';
import { addEvent, deleteEventWithSnapshot, updateEvent } from '../../db/queries';
import { AttachmentZone } from '../shared/AttachmentZone';
import type { EventCategory, RecurrenceFrequency } from '../../types';
import styles from './EventModal.module.css';

const categories: EventCategory[] = ['work', 'personal', 'milestone', 'design', 'review', 'deadline', 'meeting', 'other'];
const recurrenceOptions: { value: RecurrenceFrequency | 'none'; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function EventModal() {
  const { modalOpen, closeModal, modalEventId, modalDefaultDate } = useStore();
  const pushToast = useToasts((s) => s.push);
  const existing = useLiveQuery(async () => (modalEventId ? db.events.get(modalEventId) : undefined), [modalEventId]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStart] = useState('09:00');
  const [endTime, setEnd] = useState('10:00');
  const [category, setCategory] = useState<EventCategory>('work');
  const [pinned, setPinned] = useState(false);
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | 'none'>('none');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    if (existing) {
      setTitle(existing.title); setDate(existing.date); setAllDay(existing.allDay);
      setStart(existing.startTime ?? '09:00'); setEnd(existing.endTime ?? '10:00'); setCategory(existing.category); setPinned(existing.pinned);
      setDescription(existing.description ?? '');
      setRecurrence(existing.recurrence ?? 'none'); setRecurrenceEnd(existing.recurrenceEnd ?? '');
    } else {
      setTitle(''); setDate(modalDefaultDate ?? new Date().toISOString().slice(0, 10)); setAllDay(true); setStart('09:00'); setEnd('10:00'); setCategory('work'); setPinned(false);
      setDescription('');
      setRecurrence('none'); setRecurrenceEnd('');
    }
  }, [existing, modalDefaultDate, modalOpen]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && closeModal();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [closeModal]);

  if (!modalOpen) return null;

  const handleDelete = async () => {
    if (!modalEventId) return;
    const snapshotTitle = existing?.title ?? 'Event';
    const restore = await deleteEventWithSnapshot(modalEventId);
    closeModal();
    if (restore) {
      pushToast({
        message: `Deleted "${snapshotTitle}"`,
        action: { label: 'Undo', onClick: () => void restore() },
      });
    }
  };

  return createPortal(
    <div className={styles.backdrop} onClick={closeModal}>
      <form className={styles.dialog} onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const data = {
          title: title.trim(),
          date,
          allDay,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          category,
          pinned,
          description: description.trim() || undefined,
          recurrence: recurrence === 'none' ? undefined : recurrence,
          recurrenceEnd: recurrence === 'none' || !recurrenceEnd ? undefined : recurrenceEnd,
        };
        if (modalEventId) await updateEvent(modalEventId, data); else await addEvent(data);
        closeModal();
      }}>
        <div className={styles.title}>{modalEventId ? 'Edit event' : 'New event'}</div>

        <div className={styles.field}>
          <label htmlFor="evt-title">Title</label>
          <input id="evt-title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>

        <div className={styles.field}>
          <label htmlFor="evt-date">Date</label>
          <input id="evt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <label className={styles.checkRow}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />All day
        </label>

        {!allDay && (
          <div className={styles.times}>
            <input type="time" value={startTime} onChange={(e) => setStart(e.target.value)} aria-label="Start time" />
            <input type="time" value={endTime} onChange={(e) => setEnd(e.target.value)} aria-label="End time" />
          </div>
        )}

        <div className={styles.field}>
          <label>Category</label>
          <div className={styles.categories}>
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className={styles.categoryBtn}
                data-category={c}
                data-active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="evt-desc">Description</label>
          <textarea id="evt-desc" placeholder="Notes, agenda, links…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <label className={styles.checkRow}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Pin to sidebar
        </label>

        <div className={styles.field}>
          <label>Repeat</label>
          <div className={styles.row}>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency | 'none')}>
              {recurrenceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {recurrence !== 'none' && (
              <input type="date" value={recurrenceEnd} min={date} onChange={(e) => setRecurrenceEnd(e.target.value)} aria-label="Recurrence end date" />
            )}
          </div>
        </div>

        {modalEventId && <AttachmentZone eventId={modalEventId} />}

        <div className={styles.actions}>
          {modalEventId && <button type="button" className={styles.deleteBtn} onClick={handleDelete}>Delete</button>}
          <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
          <button type="submit" className={styles.saveBtn}>Save</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
