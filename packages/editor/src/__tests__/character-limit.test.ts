import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { Slice } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import type { EditorView } from "@tiptap/pm/view";
import type { Transaction } from "@tiptap/pm/state";
import { describe, expect, it, vi } from "vitest";
import { CharacterLimitExtension } from "../extensions/character-limit";

function createEditor(maxLength: number) {
  return new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({
        underline: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Markdown.configure({}),
      CharacterLimitExtension.configure({ maxLength }),
    ],
    content: "",
  });
}

function pastePlainText(view: EditorView, text: string) {
  const event = {
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
    },
    preventDefault: vi.fn(),
  } as unknown as ClipboardEvent;

  let handled = false;
  view.someProp("handlePaste", (handler) => {
    handled = Boolean(handler(view, event, Slice.empty));
    return handled;
  });

  return { event, handled };
}

describe("CharacterLimitExtension", () => {
  it("粘贴被截断后请求滚动到最新光标位置", () => {
    const editor = createEditor(3);
    const dispatch = vi.spyOn(editor.view, "dispatch");

    const { event, handled } = pastePlainText(editor.view, "hello");

    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    const transaction = dispatch.mock.calls[0]?.[0] as Transaction | undefined;
    expect(transaction?.doc.textContent).toBe("hel");
    expect(transaction?.scrolledIntoView).toBe(true);

    editor.destroy();
  });
});
