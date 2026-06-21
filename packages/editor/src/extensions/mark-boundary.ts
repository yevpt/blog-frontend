import { Extension } from "@tiptap/core";
import { Plugin, type EditorState } from "@tiptap/pm/state";

const BOUNDARY_MARK_NAMES = ["link", "code"] as const;

function nodeHasMark(
  node: ReturnType<EditorState["doc"]["nodeAt"]> | null | undefined,
  state: EditorState,
  markName: string,
) {
  const markType = state.schema.marks[markName];
  if (!node || !markType) return false;
  return node.marks.some((mark) => mark.type === markType);
}

function selectionIsAtMarkedSpanStart(state: EditorState, markName: string) {
  const { selection } = state;
  if (!selection.empty) return false;

  const { $from } = selection;
  if (!$from.parent.isTextblock) return false;

  const offset = $from.parentOffset;
  const nodeAfter = $from.parent.childAfter(offset).node;
  if (!nodeHasMark(nodeAfter, state, markName)) return false;

  const nodeBefore = offset === 0 ? null : $from.parent.childBefore(offset).node;
  return !nodeHasMark(nodeBefore, state, markName);
}

/**
 * 当光标位于链接/行内代码的左边界时，清空 storedMarks，避免继续输入仍继承右侧格式。
 */
export const MarkBoundaryExtension = Extension.create({
  name: "markBoundary",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          const selectionChanged = transactions.some(
            (transaction) => transaction.selectionSet || transaction.docChanged,
          );
          if (!selectionChanged || newState.storedMarks?.length === 0) return null;

          const shouldClearMarks = BOUNDARY_MARK_NAMES.some((markName) =>
            selectionIsAtMarkedSpanStart(newState, markName),
          );
          if (!shouldClearMarks) return null;

          return newState.tr.setStoredMarks([]);
        },
      }),
    ];
  },
});
