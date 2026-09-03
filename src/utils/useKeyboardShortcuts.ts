import { useEffect } from 'react';
import { todayISO } from './dateHelpers';
import { useCalendarNav } from './navigation';
import useStore from '../store/useStore';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return /^(input|textarea|select)$/i.test(target.tagName);
}

export function useKeyboardShortcuts() {
  const closeModal = useStore((s) => s.closeModal);
  const openAddModal = useStore((s) => s.openAddModal);
  const modalOpen = useStore((s) => s.modalOpen);
  const view = useStore((s) => s.view);
  const currentYear = useStore((s) => s.currentYear);
  const currentMonth = useStore((s) => s.currentMonth);
  const selectedDate = useStore((s) => s.selectedDate);
  const nav = useCalendarNav();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) closeModal();
        return;
      }
      // Without these guards every keystroke in a title field or sticky note
      // fires navigation and blanks the form being typed into.
      if (modalOpen || isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (view === 'month') { e.preventDefault(); nav.navigateMonth(-1, currentYear, currentMonth); }
          break;
        case 'ArrowRight':
          if (view === 'month') { e.preventDefault(); nav.navigateMonth(1, currentYear, currentMonth); }
          break;
        case 't': case 'T':
          e.preventDefault(); nav.goToToday();
          break;
        case 'n': case 'N':
          e.preventDefault(); openAddModal(selectedDate ?? todayISO());
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal, currentMonth, currentYear, modalOpen, nav, openAddModal, selectedDate, view]);
}
