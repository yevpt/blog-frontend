import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { markdownToHtml } from "../utils/markdown-to-html";

function createEditor(initialMarkdown = "") {
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
    ],
    content: initialMarkdown,
    contentType: "markdown",
  });
}

const TOKEN_SECTION = `（为了赚回我的订阅费，只能化身无情监工去消耗Token😂）。



之前都是爬的景区，香山、八大处、凤凰岭之流。`;

const TOKEN_SECTION_CRLF =
  "（为了赚回我的订阅费，只能化身无情监工去消耗Token😂）。\r\n\r\n\r\n\r\n之前都是爬的景区，香山、八大处、凤凰岭之流。";

function countParagraphs(editor: Editor): number {
  let count = 0;
  editor.state.doc.forEach((node) => {
    if (node.type.name === "paragraph") count += 1;
  });
  return count;
}

describe("RichEditor markdown load", () => {
  it("contentType markdown 保留 Token 段后的空段落", () => {
    const editor = createEditor(TOKEN_SECTION);

    expect(countParagraphs(editor)).toBeGreaterThanOrEqual(3);
    expect(editor.getMarkdown()).toContain("之前都是爬的景区");
    editor.destroy();
  });

  it("contentType markdown 保留 CRLF 段间空行", () => {
    const editor = createEditor(TOKEN_SECTION_CRLF);

    expect(countParagraphs(editor)).toBeGreaterThanOrEqual(3);
    editor.destroy();
  });

  it("marked→HTML 往返会丢失空段落（回归对照）", () => {
    const editor = createEditor();
    editor.commands.setContent(markdownToHtml(TOKEN_SECTION), { emitUpdate: false });

    expect(countParagraphs(editor)).toBeLessThan(3);
    editor.destroy();
  });

  it("setContent contentType markdown 与初始加载等价", () => {
    const editor = createEditor();
    editor.commands.setContent(TOKEN_SECTION_CRLF, { contentType: "markdown", emitUpdate: false });

    expect(countParagraphs(editor)).toBeGreaterThanOrEqual(3);
    editor.destroy();
  });
});
