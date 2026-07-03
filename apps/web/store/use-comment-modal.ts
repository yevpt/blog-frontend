import { create } from "zustand";

type CommentModalTargetType = "article" | "moment";

interface CommentModalStore {
  targetType: CommentModalTargetType | null;
  targetId: number | null;
  onCommentAdded: (() => void) | null;
  isVisible: boolean;
  open: (targetType: CommentModalTargetType, targetId: number, onCommentAdded?: () => void) => void;
  close: () => void;
  /** 导航守卫用：前进导航时调用，仅隐藏，保留 target 供后续可能的 show() 恢复 */
  hide: () => void;
  /** 导航守卫用：精确后退回到打开弹窗的页面时调用 */
  show: () => void;
}

export const useCommentModal = create<CommentModalStore>((set) => ({
  targetType: null,
  targetId: null,
  onCommentAdded: null,
  isVisible: false,
  open: (targetType, targetId, onCommentAdded) =>
    set({ targetType, targetId, onCommentAdded: onCommentAdded ?? null, isVisible: true }),
  close: () => set({ targetType: null, targetId: null, onCommentAdded: null, isVisible: false }),
  hide: () => set({ isVisible: false }),
  show: () => set({ isVisible: true }),
}));
