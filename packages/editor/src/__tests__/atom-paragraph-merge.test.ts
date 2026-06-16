// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { AtomParagraphMergeExtension } from "../extensions/atom-paragraph-merge";

/**
 * 验证 AtomParagraphMergeExtension：
 * 空段落与图片（块级原子节点）相邻时，Backspace/Delete 应删除空段落本身，
 * 而不是被 ProseMirror 默认逻辑转换为「选中图片」。
 *
 * 注意：测试用例中图片前后都额外保留一个非空段落，避免触发 StarterKit 自带的
 * TrailingNode 扩展（它会在文档末尾节点不是文本块时自动补一个空段落，
 * 如果图片本身是文档最后一个节点，删除其后空段落会被 TrailingNode 立即补回，
 * 导致断言失真，并非本扩展的行为）。
 */
describe("AtomParagraphMergeExtension", () => {
  function makeEditor(content: string) {
    return new Editor({
      element: document.createElement("div"),
      extensions: [
        StarterKit.configure({ blockquote: false, horizontalRule: false }),
        Image.configure({ inline: false }),
        AtomParagraphMergeExtension,
      ],
      content,
    });
  }

  it("图片后的空段落起始处按 Backspace 会删除该空段落", () => {
    const editor = makeEditor('<img src="a.png" /><p></p><p>tail</p>');
    // 光标移到空段落的起始处
    editor.commands.setTextSelection(2);
    const handled = editor.commands.deleteEmptyParagraphBeforeAtom();

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.firstChild?.type.name).toBe("image");
    expect(editor.state.doc.lastChild?.textContent).toBe("tail");
    editor.destroy();
  });

  it("图片前的空段落末尾处按 Delete 会删除该空段落，使图片前移", () => {
    const editor = makeEditor('<p></p><img src="a.png" /><p>tail</p>');
    editor.commands.setTextSelection(1);
    const handled = editor.commands.deleteEmptyParagraphAfterAtom();

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.firstChild?.type.name).toBe("image");
    editor.destroy();
  });

  it("段落不为空时 Backspace 不触发自定义删除（交给默认行为处理）", () => {
    const editor = makeEditor('<img src="a.png" /><p>hello</p>');
    editor.commands.setTextSelection(editor.state.doc.content.size - 5);
    const handled = editor.commands.deleteEmptyParagraphBeforeAtom();

    expect(handled).toBe(false);
    expect(editor.state.doc.childCount).toBe(2);
    editor.destroy();
  });

  it("前一个节点是普通文本块（非原子节点）时不触发自定义删除", () => {
    const editor = makeEditor("<p>hello</p><p></p>");
    editor.commands.setTextSelection(editor.state.doc.content.size);
    const handled = editor.commands.deleteEmptyParagraphBeforeAtom();

    expect(handled).toBe(false);
    expect(editor.state.doc.childCount).toBe(2);
    editor.destroy();
  });

  it("空段落是文档第一个节点时 Backspace 不触发（无前驱节点）", () => {
    const editor = makeEditor('<p></p><img src="a.png" /><p>tail</p>');
    editor.commands.setTextSelection(1);
    const handled = editor.commands.deleteEmptyParagraphBeforeAtom();

    expect(handled).toBe(false);
    expect(editor.state.doc.childCount).toBe(3);
    editor.destroy();
  });
});
