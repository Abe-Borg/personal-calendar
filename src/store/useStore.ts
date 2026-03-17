import { addMonths } from 'date-fns';
import { create } from 'zustand';
import type { UIState } from '../types';

interface StoreActions {
  navigateMonth: (direction: 1 | -1) => void;
  goToToday: () => void;
  selectDate: (date: string) => void;
  goToMonthView: () => void;
  toggleSidebar: () => void;
  openAddModal: (defaultDate?: string, defaultTime?: string) => void;
  openEditModal: (eventId: string) => void;
  closeModal: () => void;
}

const useStore = create<UIState & StoreActions>((set, get) => {
  const today = new Date();
  return {
    currentYear: today.getFullYear(),
    currentMonth: today.getMonth(),
    selectedDate: null,
    view: 'month',
    sidebarOpen: true,
    modalOpen: false,
    modalEventId: null,
    modalDefaultDate: null,
    modalDefaultTime: null,
    navigateMonth: (direction) => {
      const { currentYear, currentMonth } = get();
      const d = addMonths(new Date(currentYear, currentMonth, 1), direction);
      set({ currentYear: d.getFullYear(), currentMonth: d.getMonth() });
    },
    goToToday: () => {
      const d = new Date();
      set({ currentYear: d.getFullYear(), currentMonth: d.getMonth(), selectedDate: null, view: 'month' });
    },
    selectDate: (date) => set({ selectedDate: date, view: 'day' }),
    goToMonthView: () => set({ selectedDate: null, view: 'month' }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    openAddModal: (defaultDate, defaultTime) =>
      set({ modalOpen: true, modalEventId: null, modalDefaultDate: defaultDate ?? null, modalDefaultTime: defaultTime ?? null }),
    openEditModal: (eventId) => set({ modalOpen: true, modalEventId: eventId, modalDefaultDate: null, modalDefaultTime: null }),
    closeModal: () => set({ modalOpen: false, modalEventId: null }),
  };
});

export default useStore;
