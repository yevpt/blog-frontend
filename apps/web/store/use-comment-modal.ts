import { create } from "zustand";

type CommentModalTargetType = "article" | "moment";

interface CommentModalStore {
  targetType: CommentModalTargetType | null;
  targetId: number | null;
  onCommentAdded: (() => void) | null;
  open: (targetType: CommentModalTargetType, targetId: number, onCommentAdded?: () => void) => void;
  close: () => void;
}

export const useCommentModal = create<CommentModalStore>((set) => ({
  targetType: null,
  targetId: null,
  onCommentAdded: null,
  open: (targetType, targetId, onCommentAdded) =>
    set({ targetType, targetId, onCommentAdded: onCommentAdded ?? null }),
  close: () => set({ targetType: null, targetId: null, onCommentAdded: null }),
}));
