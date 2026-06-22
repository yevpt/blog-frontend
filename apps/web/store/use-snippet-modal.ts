import { create } from "zustand";
import type { MomentItemResp } from "@repo/api";

interface SnippetModalStore {
  isOpen: boolean;
  editingSnippet: MomentItemResp | null;
  submitEdit: ((content: string) => Promise<MomentItemResp>) | null;
  /** 成功发布碎语的累计次数；碎语列表订阅此值，变化时刷新到第一页 */
  publishCount: number;
  /** 最近一次成功发布碎语的用户 ID；用于 owner 列表只响应相关发布 */
  lastPublishedUserId: number | null;
  open: (
    editingSnippet?: MomentItemResp | null,
    submitEdit?: ((content: string) => Promise<MomentItemResp>) | null,
  ) => void;
  close: () => void;
  /** 发布成功后调用，通知所有挂载中的列表刷新 */
  markPublished: (userId?: number | null) => void;
}

export const useSnippetModal = create<SnippetModalStore>((set) => ({
  isOpen: false,
  editingSnippet: null,
  submitEdit: null,
  publishCount: 0,
  lastPublishedUserId: null,
  open: (editingSnippet = null, submitEdit = null) =>
    set({ isOpen: true, editingSnippet, submitEdit }),
  close: () => set({ isOpen: false, editingSnippet: null, submitEdit: null }),
  markPublished: (userId = null) =>
    set((s) => ({ publishCount: s.publishCount + 1, lastPublishedUserId: userId })),
}));
