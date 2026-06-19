import { create } from "zustand";
import type { ImageItem } from "@repo/ui";

interface ImageViewerStore {
  isOpen: boolean;
  images: ImageItem[];
  index: number;
  open: (images: ImageItem[], index: number) => void;
  close: () => void;
  setIndex: (index: number) => void;
}

const clampIndex = (index: number, length: number) =>
  Math.min(Math.max(index, 0), Math.max(length - 1, 0));

export const useImageViewer = create<ImageViewerStore>((set) => ({
  isOpen: false,
  images: [],
  index: 0,
  open: (images, index) => {
    if (images.length === 0) return;
    set({ isOpen: true, images, index: clampIndex(index, images.length) });
  },
  close: () => set({ isOpen: false }),
  setIndex: (index) => set((s) => ({ index: clampIndex(index, s.images.length) })),
}));
