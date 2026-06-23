import { create } from "zustand";

interface NotificationStore {
  unreadCount: number;
  hasLoaded: boolean;
  setUnreadCount: (count: number) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  hasLoaded: false,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, Math.floor(count)), hasLoaded: true }),
  reset: () => set({ unreadCount: 0, hasLoaded: false }),
}));
