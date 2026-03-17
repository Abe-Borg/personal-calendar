import { useEffect } from 'react';
import { toISODate } from './dateHelpers';
import useStore from '../store/useStore';

export function useKeyboardShortcuts() {
  const { closeModal, navigateMonth, view, goToToday, openAddModal, modalOpen } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) closeModal();
      if (view === 'month' && e.key === 'ArrowLeft') navigateMonth(-1);
      if (view === 'month' && e.key === 'ArrowRight') navigateMonth(1);
      if (e.key.toLowerCase() === 't') goToToday();
      if (e.key.toLowerCase() === 'n') openAddModal(toISODate(new Date()));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal, goToToday, modalOpen, navigateMonth, openAddModal, view]);
}
