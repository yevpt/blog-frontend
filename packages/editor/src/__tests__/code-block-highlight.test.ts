// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockExtension } from "../extensions/code-block";

/**
 * 验证 CodeBlockExtension 的高亮行为：
 * - Plain Text（未指定语言 / language=plaintext）的代码块不应有任何语法高亮，
 *   即不能因为 lowlight 的 highlightAuto 自动探测而被着色。
 * - 指定真实语言（如 javascript）的代码块仍正常高亮。
 *
 * 背景：lowlight 插件在 language 为空时会回退到 highlightAuto 自动探测语言，
 * 导致选了「Plain Text」的代码块仍被着色，与需求不符。
 */
describe("CodeBlockExtension 语法高亮", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  function makeEditor(content: string) {
    return new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit.configure({ codeBlock: false }), CodeBlockExtension],
      content,
    });
  }

  // 收集所有 DecorationSet 插件里带 hljs-* 类名的装饰（语法高亮的标志）
  function hljsDecorations(ed: Editor): string[] {
    const classes: string[] = [];
    for (const plugin of ed.state.plugins) {
      const state = plugin.getState?.(ed.state);
      if (state instanceof DecorationSet) {
        for (const deco of state.find()) {
          const cls = (deco as { type?: { attrs?: { class?: string } } }).type?.attrs?.class ?? "";
          if (cls.includes("hljs")) classes.push(cls);
        }
      }
    }
    return classes;
  }

  it("未指定语言的代码块不应被自动高亮", () => {
    editor = makeEditor("<pre><code>const x = 1; function foo() { return x; }</code></pre>");
    expect(hljsDecorations(editor)).toHaveLength(0);
  });

  it("显式选择 Plain Text（plaintext）的代码块不应被高亮", () => {
    editor = makeEditor(
      '<pre><code class="language-plaintext">const x = 1; function foo() {}</code></pre>',
    );
    expect(hljsDecorations(editor)).toHaveLength(0);
  });

  it("指定 javascript 的代码块仍应正常高亮", () => {
    editor = makeEditor(
      '<pre><code class="language-javascript">const x = 1; function foo() { return x; }</code></pre>',
    );
    expect(hljsDecorations(editor).length).toBeGreaterThan(0);
  });
});
