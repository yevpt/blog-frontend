import { create } from "zustand";

interface SnippetModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSnippetModal = create<SnippetModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
