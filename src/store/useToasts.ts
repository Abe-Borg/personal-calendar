import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: crypto.randomUUID() }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
