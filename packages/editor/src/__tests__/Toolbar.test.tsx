import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnderlineExtension } from "../extensions/underline";
import { Toolbar } from "../toolbar/Toolbar";

interface ToolbarHarnessProps {
  content: string;
  onMarkdownChange: (markdown: string) => void;
}

function ToolbarHarness({ content, onMarkdownChange }: ToolbarHarnessProps) {
  const [selectionReady, setSelectionReady] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ underline: false }), UnderlineExtension, Markdown],
    content,
    onUpdate: ({ editor }) => {
      onMarkdownChange(editor.getMarkdown());
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.commands.selectAll();
    onMarkdownChange(editor.getMarkdown());
    setSelectionReady(true);
  }, [editor, onMarkdownChange]);

  if (!editor || !selectionReady) return null;

  return (
    <>
      <EditorContent editor={editor} />
      <Toolbar editor={editor} />
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
});
