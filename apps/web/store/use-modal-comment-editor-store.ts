import { create } from "zustand";
import type {
  EditTarget as CommentEditTarget,
  ReplyEditTarget,
  ReplyTarget,
} from "@/components/comments/parts/comment-item";

export type ModalCommentEditTargetValue = CommentEditTarget | ReplyEditTarget;

interface ModalCommentEditorEntry {
  replyTarget: ReplyTarget | null;
  editTarget: ModalCommentEditTargetValue | null;
  content: string;
}

const EMPTY_ENTRY: ModalCommentEditorEntry = { replyTarget: null, editTarget: null, content: "" };

interface ModalCommentEditorStore {
  /** key 由调用方拼，约定为 `${targetType}:${targetId}`（评论弹窗一次只对应一个目标） */
  entries: Record<string, ModalCommentEditorEntry>;
  startReply: (key: string, target: ReplyTarget) => void;
  startEdit: (key: string, target: ModalCommentEditTargetValue) => void;
  setContent: (key: string, content: string) => void;
  reset: (key: string) => void;
  discardAll: () => void;
}

function removeKey(
  entries: Record<string, ModalCommentEditorEntry>,
  key: string,
): Record<string, ModalCommentEditorEntry> {
  if (!(key in entries)) return entries;
  const next = { ...entries };
  delete next[key];
  return next;
}

export const useModalCommentEditorStore = create<ModalCommentEditorStore>((set) => ({
  entries: {},
  startReply: (key, target) =>
    set((state) => ({
      entries: { ...state.entries, [key]: { replyTarget: target, editTarget: null, content: "" } },
    })),
  startEdit: (key, target) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [key]: { replyTarget: null, editTarget: target, content: target.initialContent },
      },
    })),
  setContent: (key, content) =>
    set((state) => ({
      entries: { ...state.entries, [key]: { ...(state.entries[key] ?? EMPTY_ENTRY), content } },
    })),
  reset: (key) => set((state) => ({ entries: removeKey(state.entries, key) })),
  discardAll: () => set({ entries: {} }),
}));
