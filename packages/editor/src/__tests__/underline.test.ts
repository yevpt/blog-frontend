import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { UnderlineExtension } from "../extensions/underline";

/**
 * 验证 UnderlineExtension 的核心行为：
 * 1. 可在编辑器中注册（不与 StarterKit 冲突）
 * 2. toggleUnderline 命令可正常调用
 * 3. 序列化为 <u>text</u>（Markdown 内联 HTML，而非 ++text++）
 */
describe("UnderlineExtension", () => {
  function makeEditor(content = "<p>hello</p>") {
    return new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit.configure({ underline: false }), UnderlineExtension, Markdown],
      content,
    });
  }

  it("注册后 toggleUnderline 命令存在", () => {
    const editor = makeEditor();
    expect(typeof editor.commands.toggleUnderline).toBe("function");
    editor.destroy();
  });

  it("对选中文本应用下划线后序列化为 <u>text</u>", () => {
    const editor = makeEditor("<p>hello</p>");
    editor.commands.selectAll();
    editor.commands.toggleUnderline();
    const md = editor.getMarkdown();
    expect(md).toContain("<u>hello</u>");
    editor.destroy();
  });

  it("再次 toggle 可取消下划线", () => {
    const editor = makeEditor("<p>hello</p>");
    editor.commands.selectAll();
    editor.commands.toggleUnderline();
    editor.commands.toggleUnderline();
    const md = editor.getMarkdown();
    expect(md).not.toContain("<u>");
    editor.destroy();
  });
});
