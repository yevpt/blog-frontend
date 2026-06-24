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

interface ToolbarHarnessProps extends Pick<InsertHandlers, "onInsertLink"> {
  content: string;
  onMarkdownChange: (markdown: string) => void;
  onEditorReady?: (editor: Editor) => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  showBlockquote?: boolean;
}

function ToolbarHarness({
  content,
  onMarkdownChange,
  onEditorReady,
  onInsertLink,
  onSubmit,
  submitDisabled,
  showBlockquote,
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
      <Toolbar
        editor={editor}
        onInsertLink={onInsertLink}
        onSubmit={onSubmit}
        submitDisabled={submitDisabled}
        showBlockquote={showBlockquote}
      />
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

  it("submitDisabled 为 true 时禁用提交按钮，即使有内容", async () => {
    const onMarkdownChange = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <ToolbarHarness
        content="<p>hello</p>"
        onMarkdownChange={onMarkdownChange}
        onSubmit={onSubmit}
        submitDisabled
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "发送评论" });
    expect(submitBtn).toBeDisabled();

    await user.click(submitBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("有内容且未禁用时提交按钮可点击触发 onSubmit", async () => {
    const onMarkdownChange = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <ToolbarHarness
        content="<p>hello</p>"
        onMarkdownChange={onMarkdownChange}
        onSubmit={onSubmit}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "发送评论" });
    expect(submitBtn).not.toBeDisabled();

    await user.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledOnce();
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

  it("空首行插入代码块时，代码块直接占第一行并聚焦在代码块内", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;

    render(
      <ToolbarHarness
        content=""
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入代码块" }));

    expect(editorRef?.state.doc.child(0).type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(1).type.name).toBe("paragraph");
    expect(editorRef?.state.selection.$from.parent.type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(0).attrs.language).toBe("plaintext");

    await act(async () => {
      editorRef?.commands.insertContent("const answer = 42;");
    });

    expect(editorRef?.state.doc.child(0).textContent).toBe("const answer = 42;");
  });

  it("当前行已有内容时，代码块插入到下一行并聚焦在代码块内", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;

    render(
      <ToolbarHarness
        content="<p>hello</p>"
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
          editor.commands.setTextSelection(6);
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入代码块" }));

    expect(editorRef?.state.doc.child(0).type.name).toBe("paragraph");
    expect(editorRef?.state.doc.child(0).textContent).toBe("hello");
    expect(editorRef?.state.doc.child(1).type.name).toBe("codeBlock");
    expect(editorRef?.state.doc.child(2).type.name).toBe("paragraph");
    expect(editorRef?.state.selection.$from.parent.type.name).toBe("codeBlock");
  });

  it("代码块在第一行时，起点再次向左移动会跳到代码块左侧输入位置", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();
    let editorRef: Editor | undefined;

    render(
      <ToolbarHarness
        content=""
        onMarkdownChange={onMarkdownChange}
        onEditorReady={(editor) => {
          editorRef = editor;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入代码块" }));

    await act(async () => {
      editorRef?.commands.insertContent("const answer = 42;");
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

  it("showBlockquote 为 true 时渲染引用按钮，点击后输出 Markdown 引用", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();

    render(
      <ToolbarHarness content="<p>hello</p>" onMarkdownChange={onMarkdownChange} showBlockquote />,
    );

    const button = screen.getByRole("button", { name: "引用" });
    expect(button).not.toHaveAttribute("aria-pressed");

    await user.click(button);

    await waitFor(() => {
      expect(onMarkdownChange.mock.calls.at(-1)?.[0]).toMatch(/^> hello/);
    });
  });

  it("未开启 showBlockquote 时不渲染引用按钮", () => {
    render(<ToolbarHarness content="<p>hello</p>" onMarkdownChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "引用" })).not.toBeInTheDocument();
  });
});
