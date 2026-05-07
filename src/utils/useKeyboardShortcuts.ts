import { useEffect } from 'react';
import { toISODate } from './dateHelpers';
import { useCalendarNav } from './navigation';
import useStore from '../store/useStore';

export function useKeyboardShortcuts() {
  const { closeModal, view, openAddModal, modalOpen, currentYear, currentMonth } = useStore();
  const nav = useCalendarNav();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) closeModal();
      if (view === 'month' && e.key === 'ArrowLeft') nav.navigateMonth(-1, currentYear, currentMonth);
      if (view === 'month' && e.key === 'ArrowRight') nav.navigateMonth(1, currentYear, currentMonth);
      if (e.key.toLowerCase() === 't') nav.goToToday();
      if (e.key.toLowerCase() === 'n') openAddModal(toISODate(new Date()));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal, currentMonth, currentYear, modalOpen, nav, openAddModal, view]);
}
