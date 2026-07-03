import { create } from "zustand";

interface FriendLinksPausedStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** 导航守卫触发时调用 */
  reset: () => void;
}

export const useFriendLinksPausedStore = create<FriendLinksPausedStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  reset: () => set({ open: false }),
}));
