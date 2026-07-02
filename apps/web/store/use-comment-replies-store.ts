import { create } from "zustand";
import type { TargetType } from "@/components/comments/parts/comment-replies";

interface CommentRepliesStore {
  /** 已展开的回复线程，键为 `${targetType}:${commentId}` */
  openKeys: Set<string>;
  setOpen: (targetType: TargetType, commentId: number, open: boolean) => void;
}

function keyOf(targetType: TargetType, commentId: number): string {
  return `${targetType}:${commentId}`;
}

export const useCommentRepliesStore = create<CommentRepliesStore>((set, get) => ({
  openKeys: new Set(),
  setOpen: (targetType, commentId, open) => {
    const key = keyOf(targetType, commentId);
    const hasKey = get().openKeys.has(key);
    if (hasKey === open) return;
    const next = new Set(get().openKeys);
    if (open) {
      next.add(key);
    } else {
      next.delete(key);
    }
    set({ openKeys: next });
  },
}));
