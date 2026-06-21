import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeBlockExtension } from "../extensions/code-block";
import { MarkBoundaryExtension } from "../extensions/mark-boundary";
import { UnderlineExtension } from "../extensions/underline";
import { Toolbar } from "../toolbar/Toolbar";
import type { InsertHandlers } from "../types";

interface ToolbarHarnessProps extends Pick<InsertHandlers, "onInsertCode" | "onInsertLink"> {
  content: string;
  onMarkdownChange: (markdown: string) => void;
  onEditorReady?: (editor: Editor) => void;
}

function ToolbarHarness({
  content,
  onMarkdownChange,
  onEditorReady,
  onInsertCode,
  onInsertLink,
}: ToolbarHarnessProps) {
  const [selectionReady, setSelectionReady] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false, codeBlock: false }),
      UnderlineExtension,
      CodeBlockExtension,
      MarkBoundaryExtension,
      Markdown,
    ],
    content,
    onUpdate: ({ editor }) => {
      onMarkdownChange(editor.getMarkdown());
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.commands.selectAll();
    onMarkdownChange(editor.getMarkdown());
    onEditorReady?.(editor);
    setSelectionReady(true);
  }, [editor, onEditorReady, onMarkdownChange]);

  if (!editor || !selectionReady) return null;

  return (
    <>
      <EditorContent editor={editor} />
      <Toolbar editor={editor} onInsertCode={onInsertCode} onInsertLink={onInsertLink} />
    </>
  );
}

describe("Toolbar", () => {
  it.each([
    ["B", "粗体（Ctrl+B）"],
    ["I", "斜体（Ctrl+I）"],
    ["U", "下划线（Ctrl+U）"],
  ])("点击 %s 后按钮会立刻进入 active 状态", async (_label, name) => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();

    render(<ToolbarHarness content="<p>hello</p>" onMarkdownChange={onMarkdownChange} />);

    const button = screen.getByRole("button", { name });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("混合粗体选区点击 B 后会统一应用粗体", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();

    render(
      <ToolbarHarness
        content="<p><strong>he</strong>llo</p>"
        onMarkdownChange={onMarkdownChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "粗体（Ctrl+B）" }));

    await waitFor(() => {
      expect(onMarkdownChange).toHaveBeenLastCalledWith("**hello**");
    });
  });

  it("链接插在文档开头后，左边界输入不会继续落在链接内", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;
    let insertLink: ((url: string, title?: string) => void) | undefined;

    render(
      <ToolbarHarness
        content=""
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
        }}
        onInsertLink={(insert) => {
          insertLink = insert;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入链接" }));

    await act(async () => {
      insertLink?.("https://example.com", "docs");
      editorRef?.commands.setTextSelection(1);
      editorRef?.commands.insertContent("before ");
    });

    expect(editorRef?.getMarkdown()).toBe("before [docs](https://example.com)");
  });

  it("空首行插入代码块时，代码块直接占第一行", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;
    let insertCode: ((code: string, lang: string) => void) | undefined;

    render(
      <ToolbarHarness
        content=""
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
        }}
        onInsertCode={(insert) => {
          insertCode = insert;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入代码块" }));

    await act(async () => {
      insertCode?.("const answer = 42;", "javascript");
    });

    expect(editorRef?.state.doc.child(0).type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(1).type.name).toBe("paragraph");
    expect(editorRef?.state.selection.$from.parent.type.name).toBe("paragraph");

    await act(async () => {
      editorRef?.commands.insertContent("after");
    });

    expect(editorRef?.state.doc.child(0).textContent).toBe("const answer = 42;");
    expect(editorRef?.state.doc.child(1).textContent).toBe("after");
  });

  it("当前行已有内容时，代码块插入到下一行", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;
    let insertCode: ((code: string, lang: string) => void) | undefined;

    render(
      <ToolbarHarness
        content="<p>hello</p>"
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
          editor.commands.setTextSelection(6);
        }}
        onInsertCode={(insert) => {
          insertCode = insert;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入代码块" }));

    await act(async () => {
      insertCode?.("const answer = 42;", "javascript");
    });

    expect(editorRef?.state.doc.child(0).type.name).toBe("paragraph");
    expect(editorRef?.state.doc.child(0).textContent).toBe("hello");
    expect(editorRef?.state.doc.child(1).type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(2).type.name).toBe("paragraph");
    expect(editorRef?.state.selection.$from.parent.type.name).toBe("paragraph");
  });

  it("代码块在第一行时，起点再次向左移动会跳到代码块左侧输入位置", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;
    let insertCode: ((code: string, lang: string) => void) | undefined;

    render(
      <ToolbarHarness
        content=""
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
        }}
        onInsertCode={(insert) => {
          insertCode = insert;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入代码块" }));

    await act(async () => {
      insertCode?.("const answer = 42;", "javascript");
    });

    expect(editorRef?.state.doc.child(0).type.name).toBe("codeBlock");

    await act(async () => {
      editorRef?.commands.setTextSelection(1);
      editorRef?.commands.keyboardShortcut("ArrowLeft");
    });

    await act(async () => {
      const view = editorRef!.view;
      const { from, to } = view.state.selection;
      view.someProp("handleTextInput", (handler) =>
        handler(view, from, to, "before", () => view.state.tr),
      );
    });

    expect(editorRef?.state.doc.child(0).type.name).toBe("paragraph");
    expect(editorRef?.state.doc.child(0).textContent).toBe("before");
    expect(editorRef?.state.doc.child(1).type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(1).textContent).toBe("const answer = 42;");
  });
});
