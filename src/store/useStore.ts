import { create } from 'zustand';
import type { UIState } from '../types';

interface RouteState {
  view: UIState['view'];
  currentYear: number;
  currentMonth: number;
  selectedDate: string | null;
}

interface StoreActions {
  setRouteState: (s: RouteState) => void;
  toggleSidebar: () => void;
  openAddModal: (defaultDate?: string, defaultTime?: string) => void;
  openEditModal: (eventId: string) => void;
  closeModal: () => void;
}

const useStore = create<UIState & StoreActions>((set) => {
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
    setRouteState: (s) => set(s),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    openAddModal: (defaultDate, defaultTime) =>
      set({ modalOpen: true, modalEventId: null, modalDefaultDate: defaultDate ?? null, modalDefaultTime: defaultTime ?? null }),
    openEditModal: (eventId) => set({ modalOpen: true, modalEventId: eventId, modalDefaultDate: null, modalDefaultTime: null }),
    closeModal: () => set({ modalOpen: false, modalEventId: null }),
  };
});

export default useStore;
