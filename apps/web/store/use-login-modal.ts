import { create } from "zustand";

type ModalView = "login" | "register" | "recover";

interface LoginModalStore {
  isOpen: boolean;
  view: ModalView;
  open: (view?: ModalView) => void;
  close: () => void;
  setView: (view: ModalView) => void;
}

export const useLoginModal = create<LoginModalStore>((set) => ({
  isOpen: false,
  view: "login",
  open: (view = "login") => set({ isOpen: true, view }),
  close: () => set({ isOpen: false, view: "login" }),
  // 仅在弹窗已打开时调用（供登录↔注册视图切换使用）
  setView: (view) => set({ view }),
}));
