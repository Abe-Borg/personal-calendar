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

/** Matches the drawer breakpoint in AppShell.module.css. */
const MOBILE_QUERY = '(max-width: 700px)';

/**
 * On desktop the sidebar is a layout column, so open is the right default. On
 * mobile it is an overlay, and defaulting to open buries the calendar behind it
 * on first load.
 */
const sidebarStartsOpen = () =>
  typeof window === 'undefined' || !window.matchMedia?.(MOBILE_QUERY).matches;

const useStore = create<UIState & StoreActions>((set) => {
  const today = new Date();
  return {
    currentYear: today.getFullYear(),
    currentMonth: today.getMonth(),
    selectedDate: null,
    view: 'month',
    sidebarOpen: sidebarStartsOpen(),
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
