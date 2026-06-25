import { create } from "zustand";
import type { MomentItemResp } from "@repo/api";
import type { MomentImageItem } from "../components/moments/types";

interface MomentModalStore {
  isOpen: boolean;
  editingMoment: MomentItemResp | null;
  submitEdit: ((content: string, images: MomentImageItem[]) => Promise<MomentItemResp>) | null;
  /** 成功发布碎语的累计次数；碎语列表订阅此值，变化时刷新到第一页 */
  publishCount: number;
  /** 最近一次成功发布碎语的用户 ID；用于 owner 列表只响应相关发布 */
  lastPublishedUserId: number | null;
  open: (
    editingMoment?: MomentItemResp | null,
    submitEdit?: ((content: string, images: MomentImageItem[]) => Promise<MomentItemResp>) | null,
  ) => void;
  close: () => void;
  /** 发布成功后调用，通知所有挂载中的列表刷新 */
  markPublished: (userId?: number | null) => void;
}

export const useMomentModal = create<MomentModalStore>((set) => ({
  isOpen: false,
  editingMoment: null,
  submitEdit: null,
  publishCount: 0,
  lastPublishedUserId: null,
  open: (editingMoment = null, submitEdit = null) =>
    set({ isOpen: true, editingMoment, submitEdit }),
  close: () => set({ isOpen: false, editingMoment: null, submitEdit: null }),
  markPublished: (userId = null) =>
    set((s) => ({ publishCount: s.publishCount + 1, lastPublishedUserId: userId })),
}));
