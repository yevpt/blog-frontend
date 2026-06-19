import { Extension } from "@tiptap/core";
import { NodeSelection, Selection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    atomParagraphMerge: {
      /** 光标在空段落起始处、且前一个兄弟节点是非文本块级原子节点（如图片）时，删除该空段落 */
      deleteEmptyParagraphBeforeAtom: () => ReturnType;
      /** 光标在空段落末尾处、且后一个兄弟节点是非文本块级原子节点（如图片）时，删除该空段落 */
      deleteEmptyParagraphAfterAtom: () => ReturnType;
      /** 原子节点（如图片）被整体选中时，方向键应将选区收起为节点旁边的文字光标 */
      moveCursorPastAtomSelection: (dir: -1 | 1) => ReturnType;
    };
  }
}

/**
 * 修复块级原子节点（图片）与空段落相邻时 Backspace/Delete 失效的问题。
 *
 * ProseMirror 默认的 joinBackward/joinForward 在「空段落 + 相邻原子节点」场景下，
 * 会将 Backspace/Delete 转换为「选中相邻原子节点」而不是删除当前空段落，
 * 导致图片始终卡在原位置、空段落无法被清除。
 * 这里改为：直接删除当前空段落本身，让原子节点占据其位置。
 */
export const AtomParagraphMergeExtension = Extension.create({
  name: "atomParagraphMerge",

  addCommands() {
    return {
      deleteEmptyParagraphBeforeAtom:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty || $from.parentOffset !== 0) return false;

          const parent = $from.parent;
          if (!parent.isTextblock || parent.content.size > 0) return false;

          const pos = $from.before();
          if (pos === 0) return false;

          const before = state.doc.resolve(pos).nodeBefore;
          if (!before || before.isTextblock) return false;

          if (dispatch) {
            tr.delete(pos, pos + parent.nodeSize);
          }
          return true;
        },

      deleteEmptyParagraphAfterAtom:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty || $from.parentOffset !== $from.parent.content.size) return false;

          const parent = $from.parent;
          if (!parent.isTextblock || parent.content.size > 0) return false;

          const pos = $from.after();
          if (pos > state.doc.content.size) return false;

          const after = state.doc.resolve(pos).nodeAfter;
          if (!after || after.isTextblock) return false;

          const from = $from.before();
          if (dispatch) {
            tr.delete(from, from + parent.nodeSize);
          }
          return true;
        },

      moveCursorPastAtomSelection:
        (dir) =>
        ({ state, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection) || !selection.node.isAtom) return false;

          const pos = dir < 0 ? selection.from : selection.to;
          // textOnly: 找不到合法文字位置时返回 null，把这类边界情况交给 Gapcursor 处理
          const found = Selection.findFrom(state.doc.resolve(pos), dir, true);
          if (!found) return false;

          if (dispatch) {
            dispatch(state.tr.setSelection(found));
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // macOS 键盘只有一个删除键且发送的是 Backspace，无法触发 Delete（前向删除）
      // 因此 Backspace/Delete 都需要同时尝试两种方向的空段落合并
      Backspace: () =>
        this.editor.commands.deleteEmptyParagraphBeforeAtom() ||
        this.editor.commands.deleteEmptyParagraphAfterAtom(),
      Delete: () =>
        this.editor.commands.deleteEmptyParagraphAfterAtom() ||
        this.editor.commands.deleteEmptyParagraphBeforeAtom(),
      ArrowLeft: () => this.editor.commands.moveCursorPastAtomSelection(-1),
      ArrowRight: () => this.editor.commands.moveCursorPastAtomSelection(1),
    };
  },
});
