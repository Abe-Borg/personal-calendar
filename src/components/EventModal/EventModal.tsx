import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import useStore from '../../store/useStore';
import { useToasts } from '../../store/useToasts';
import { db } from '../../db/db';
import { addEvent, deleteEventWithSnapshot, updateEvent } from '../../db/queries';
import { AttachmentZone } from '../shared/AttachmentZone';
import { isISODate, isTimeString, minutesFromMidnight, todayISO } from '../../utils/dateHelpers';
import { EVENT_CATEGORIES, RECURRENCE_FREQUENCIES, type EventCategory, type RecurrenceFrequency } from '../../types';
import styles from './EventModal.module.css';

const RECURRENCE_LABELS: Record<RecurrenceFrequency | 'none', string> = {
  none: 'Does not repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function plusOneHour(time: string): string {
  const total = Math.min(minutesFromMidnight(time) + 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function EventModal() {
  const modalOpen = useStore((s) => s.modalOpen);
  const modalEventId = useStore((s) => s.modalEventId);
  const modalDefaultDate = useStore((s) => s.modalDefaultDate);
  const modalDefaultTime = useStore((s) => s.modalDefaultTime);
  const closeModal = useStore((s) => s.closeModal);
  const pushToast = useToasts((s) => s.push);

  const existing = useLiveQuery(
    async () => (modalEventId ? db.events.get(modalEventId) : undefined),
    [modalEventId],
  );

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<EventCategory>('work');
  const [pinned, setPinned] = useState(false);
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | 'none'>('none');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dialogRef = useRef<HTMLFormElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Tracks which record the form was populated from, so a live-query refresh
  // cannot re-run the reset and wipe whatever the user has typed.
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!modalOpen) {
      initializedFor.current = null;
      return;
    }
    if (modalEventId && existing?.id !== modalEventId) return;

    const key = modalEventId ?? `new:${modalDefaultDate ?? ''}:${modalDefaultTime ?? ''}`;
    if (initializedFor.current === key) return;
    initializedFor.current = key;
    setError(null);
    setConfirmingDelete(false);

    if (existing) {
      setTitle(existing.title);
      setDate(existing.date);
      setAllDay(existing.allDay);
      setStartTime(existing.startTime ?? '09:00');
      setEndTime(existing.endTime ?? '10:00');
      setCategory(existing.category);
      setPinned(existing.pinned);
      setDescription(existing.description ?? '');
      setRecurrence(existing.recurrence ?? 'none');
      setRecurrenceEnd(existing.recurrenceEnd ?? '');
      return;
    }

    const seedTime = isTimeString(modalDefaultTime) ? modalDefaultTime : null;
    setTitle('');
    setDate(modalDefaultDate ?? todayISO());
    setAllDay(!seedTime);
    setStartTime(seedTime ?? '09:00');
    setEndTime(seedTime ? plusOneHour(seedTime) : '10:00');
    setCategory('work');
    setPinned(false);
    setDescription('');
    setRecurrence('none');
    setRecurrenceEnd('');
  }, [existing, modalDefaultDate, modalDefaultTime, modalEventId, modalOpen]);

  // Must not wait for the row: the delete confirmation stays armed across a
  // switch otherwise, and a Delete click would skip its own confirm step.
  useEffect(() => {
    setConfirmingDelete(false);
    setError(null);
  }, [modalEventId, modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => titleRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      restoreFocusRef.current?.focus?.();
    };
  }, [modalOpen]);

  // dexie-react-hooks keeps returning the previous key's row while a new query
  // resolves, so until the ids match, the fields still hold the last event.
  const awaitingRow = Boolean(modalEventId) && existing?.id !== modalEventId;
  const isSeries = Boolean(existing?.recurrence);
  const deleteLabel = useMemo(() => {
    if (!confirmingDelete) return 'Delete';
    return isSeries ? 'Delete the whole series?' : 'Really delete?';
  }, [confirmingDelete, isSeries]);

  if (!modalOpen) return null;

  if (awaitingRow) {
    return createPortal(
      <div className={styles.backdrop} onMouseDown={closeModal}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evt-heading"
          className={styles.dialog}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={styles.title} id="evt-heading">Edit event</div>
          <p className={styles.note}>Loading…</p>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const validate = (): string | null => {
    if (!title.trim()) return 'Give the event a title.';
    if (!isISODate(date)) return 'Pick a valid date.';
    if (!allDay) {
      if (!isTimeString(startTime) || !isTimeString(endTime)) return 'Pick a valid start and end time.';
      if (minutesFromMidnight(endTime) <= minutesFromMidnight(startTime)) {
        return 'The end time has to be after the start time.';
      }
    }
    if (recurrence !== 'none' && recurrenceEnd) {
      if (!isISODate(recurrenceEnd)) return 'Pick a valid repeat-until date.';
      if (recurrenceEnd < date) return 'The repeat-until date has to be on or after the event date.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
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
    if (modalEventId) await updateEvent(modalEventId, data);
    else await addEvent(data);
    closeModal();
  };

  const handleDelete = async () => {
    if (!modalEventId) return;
    // Occurrences share the stored row's id, so deleting one deletes the series.
    // Never do that on a single unconfirmed click.
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const name = existing?.title ?? 'Event';
    const restore = await deleteEventWithSnapshot(modalEventId);
    closeModal();
    if (restore) {
      pushToast({
        message: isSeries ? `Deleted the "${name}" series` : `Deleted "${name}"`,
        action: { label: 'Undo', onClick: () => void restore() },
      });
    }
  };

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={closeModal}>
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evt-heading"
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles.title} id="evt-heading">{modalEventId ? 'Edit event' : 'New event'}</div>

        <div className={styles.field}>
          <label htmlFor="evt-title">Title</label>
          <input
            id="evt-title" ref={titleRef} placeholder="What is it?"
            value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="evt-date">Date</label>
          <input id="evt-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} />
        </div>

        <label className={styles.checkRow}>
          <input type="checkbox" checked={allDay} onChange={(e) => { setAllDay(e.target.checked); setError(null); }} />
          All day
        </label>

        {!allDay && (
          <div className={styles.times}>
            <label className={styles.timeField}>
              <span>Starts</span>
              <input type="time" value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (isTimeString(e.target.value) && minutesFromMidnight(endTime) <= minutesFromMidnight(e.target.value)) {
                    setEndTime(plusOneHour(e.target.value));
                  }
                  setError(null);
                }} />
            </label>
            <label className={styles.timeField}>
              <span>Ends</span>
              <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setError(null); }} />
            </label>
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label}>Category</span>
          <div className={styles.categories}>
            {EVENT_CATEGORIES.map((c) => (
              <button
                type="button" key={c} className={styles.categoryBtn}
                data-category={c} data-active={category === c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="evt-desc">Description</label>
          <textarea id="evt-desc" placeholder="Notes, agenda, links…" value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </div>

        <label className={styles.checkRow}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Pin to sidebar
        </label>

        <div className={styles.field}>
          <label htmlFor="evt-repeat">Repeat</label>
          <div className={styles.row}>
            <select id="evt-repeat" value={recurrence}
              onChange={(e) => { setRecurrence(e.target.value as RecurrenceFrequency | 'none'); setError(null); }}>
              {(['none', ...RECURRENCE_FREQUENCIES] as const).map((value) => (
                <option key={value} value={value}>{RECURRENCE_LABELS[value]}</option>
              ))}
            </select>
            {recurrence !== 'none' && (
              <input type="date" value={recurrenceEnd} min={date} aria-label="Repeat until"
                onChange={(e) => { setRecurrenceEnd(e.target.value); setError(null); }} />
            )}
          </div>
          {recurrence !== 'none' && (
            <p className={styles.note}>
              Editing or deleting any occurrence changes the whole series.
              {recurrence === 'monthly' && ' Months without that date fall back to the last day.'}
            </p>
          )}
        </div>

        {modalEventId && <AttachmentZone eventId={modalEventId} />}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          {modalEventId && (
            <button type="button" className={styles.deleteBtn} data-confirming={confirmingDelete}
              onClick={() => void handleDelete()}>
              {deleteLabel}
            </button>
          )}
          <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
          <button type="submit" className={styles.saveBtn}>Save</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
