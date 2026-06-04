import { create } from "zustand";

type ModalView = "login" | "register";

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
  setView: (view) => set({ view }),
}));
