import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import useStore from '../../store/useStore';
import { db } from '../../db/db';
import { addEvent, deleteEvent, updateEvent } from '../../db/queries';
import { AttachmentZone } from '../shared/AttachmentZone';
import type { EventCategory } from '../../types';

const categories: EventCategory[] = ['work', 'personal', 'milestone', 'design', 'review', 'deadline', 'meeting', 'other'];

export function EventModal() {
  const { modalOpen, closeModal, modalEventId, modalDefaultDate } = useStore();
  const existing = useLiveQuery(() => (modalEventId ? db.events.get(modalEventId) : Promise.resolve(undefined)), [modalEventId]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStart] = useState('09:00');
  const [endTime, setEnd] = useState('10:00');
  const [category, setCategory] = useState<EventCategory>('work');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    if (existing) {
      setTitle(existing.title); setDate(existing.date); setAllDay(existing.allDay);
      setStart(existing.startTime ?? '09:00'); setEnd(existing.endTime ?? '10:00'); setCategory(existing.category); setPinned(existing.pinned);
    } else {
      setTitle(''); setDate(modalDefaultDate ?? new Date().toISOString().slice(0, 10)); setAllDay(true); setStart('09:00'); setEnd('10:00'); setCategory('work'); setPinned(false);
    }
  }, [existing, modalDefaultDate, modalOpen]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && closeModal();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [closeModal]);

  if (!modalOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0008' }} onClick={closeModal}>
      <form style={{ background: 'white', margin: '10vh auto', width: 480, padding: 12 }} onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const data = { title, date, allDay, startTime: allDay ? undefined : startTime, endTime: allDay ? undefined : endTime, category, pinned };
        if (modalEventId) await updateEvent(modalEventId, data); else await addEvent(data);
        closeModal();
      }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />All day</label>
        {!allDay && <><input type="time" value={startTime} onChange={(e) => setStart(e.target.value)} /><input type="time" value={endTime} onChange={(e) => setEnd(e.target.value)} /></>}
        <div>{categories.map((c) => <button type="button" key={c} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <label><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Pin to sidebar</label>
        {modalEventId && <AttachmentZone eventId={modalEventId} />}
        <div><button type="submit">Save</button>{modalEventId && <button type="button" onClick={() => void deleteEvent(modalEventId).then(closeModal)}>Delete</button>}</div>
      </form>
    </div>,
    document.body,
  );
}
