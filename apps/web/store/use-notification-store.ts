import { create } from "zustand";

interface NotificationStore {
  unreadCount: number;
  hasLoaded: boolean;
  /** 通知同步后递增，供消息中心列表静默合并首页 */
  listSyncVersion: number;
  setUnreadCount: (count: number) => void;
  bumpListSync: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  hasLoaded: false,
  listSyncVersion: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, Math.floor(count)), hasLoaded: true }),
  bumpListSync: () => set((state) => ({ listSyncVersion: state.listSyncVersion + 1 })),
  reset: () => set({ unreadCount: 0, hasLoaded: false, listSyncVersion: 0 }),
}));
