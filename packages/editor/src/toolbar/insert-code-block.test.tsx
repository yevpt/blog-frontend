import type { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { useEffect, useState } from "react";
import { CodeBlockExtension } from "../extensions/code-block";
import { insertCodeBlock } from "./insert-code-block";

function Harness({ content, onReady }: { content: string; onReady: (editor: Editor) => void }) {
  const [ready, setReady] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ codeBlock: false }), CodeBlockExtension, Markdown],
    content,
  });

  useEffect(() => {
    if (!editor) return;
    onReady(editor);
    setReady(true);
  }, [editor, onReady]);

  if (!editor || !ready) return null;
  return <EditorContent editor={editor} />;
}

describe("insertCodeBlock", () => {
  it("空文档插入空代码块并将光标移入代码块", () => {
    let editorRef: Editor | undefined;
    render(
      <Harness
        content=""
        onReady={(editor) => {
          editorRef = editor;
        }}
      />,
    );

    act(() => {
      insertCodeBlock(editorRef ?? null);
    });

    expect(editorRef?.state.doc.child(0).type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(0).textContent).toBe("");
    expect(editorRef?.state.doc.child(0).attrs.language).toBe("plaintext");
    expect(editorRef?.state.selection.$from.parent.type.name).toBe("codeBlock");
  });

  it("非空行后插入代码块并聚焦在代码块内", () => {
    let editorRef: Editor | undefined;
    render(
      <Harness
        content="<p>hello</p>"
        onReady={(editor) => {
          editorRef = editor;
          editor.commands.setTextSelection(6);
        }}
      />,
    );

    act(() => {
      insertCodeBlock(editorRef ?? null);
    });

    expect(editorRef?.state.doc.child(1).type.name).toBe("codeBlock");
    expect(editorRef?.state.selection.$from.parent.type.name).toBe("codeBlock");
  });
});
