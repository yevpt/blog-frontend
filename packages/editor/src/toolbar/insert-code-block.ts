import type { Editor, JSONContent } from "@tiptap/core";

function currentTextBlockIsEmpty(editor: Editor) {
  const { selection } = editor.state;
  return (
    selection.empty &&
    selection.$from.parent.isTextblock &&
    selection.$from.parent.content.size === 0
  );
}

/** 在光标处插入空代码块（默认 plaintext），并将选区移入代码块内。 */
export function insertCodeBlock(editor: Editor | null) {
  if (!editor) return;

  const { $from } = editor.state.selection;
  const codeBlock: JSONContent = {
    type: "codeBlock",
    attrs: { language: "plaintext" },
  };
  const content: JSONContent[] = [codeBlock, { type: "paragraph" }];

  if (editor.isEmpty) {
    editor
      .chain()
      .insertContentAt({ from: 0, to: editor.state.doc.content.size }, content)
      .setTextSelection(1)
      .focus()
      .run();
    return;
  }

  if (currentTextBlockIsEmpty(editor)) {
    const codeBlockPos = $from.before();
    editor
      .chain()
      .insertContentAt({ from: codeBlockPos, to: $from.after() }, content)
      .setTextSelection(codeBlockPos + 1)
      .focus()
      .run();
    return;
  }

  const codeBlockPos = $from.after();
  editor
    .chain()
    .insertContentAt(codeBlockPos, content)
    .setTextSelection(codeBlockPos + 1)
    .focus()
    .run();
}
