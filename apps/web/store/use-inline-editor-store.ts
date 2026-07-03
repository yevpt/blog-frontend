import { create } from "zustand";

interface InlineEditorEntry {
  isOpen: boolean;
  content: string;
}

interface InlineEditorStore {
  /** key 由调用方拼，约定为 `${作用域}:${目标ID}:${reply|edit}` */
  editors: Record<string, InlineEditorEntry>;
  open: (key: string, initialContent?: string) => void;
  setContent: (key: string, content: string) => void;
  close: (key: string) => void;
  submitSuccess: (key: string) => void;
  discardAll: () => void;
}

function removeKey(
  editors: Record<string, InlineEditorEntry>,
  key: string,
): Record<string, InlineEditorEntry> {
  if (!(key in editors)) return editors;
  const next = { ...editors };
  delete next[key];
  return next;
}

export const useInlineEditorStore = create<InlineEditorStore>((set) => ({
  editors: {},
  open: (key, initialContent = "") =>
    set((state) => ({
      editors: { ...state.editors, [key]: { isOpen: true, content: initialContent } },
    })),
  setContent: (key, content) =>
    set((state) => {
      const entry = state.editors[key];
      if (!entry) return state;
      return { editors: { ...state.editors, [key]: { ...entry, content } } };
    }),
  close: (key) => set((state) => ({ editors: removeKey(state.editors, key) })),
  submitSuccess: (key) => set((state) => ({ editors: removeKey(state.editors, key) })),
  discardAll: () => set({ editors: {} }),
}));
