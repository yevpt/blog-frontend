/**
 * CodeBlockExtension — 带语法高亮的代码块扩展
 *
 * 基于 @tiptap/extension-code-block-lowlight，集成：
 * - lowlight（common 语言集）提供 hljs-* 类名装饰
 * - ReactNodeViewRenderer 渲染语言标签（CodeBlockView）
 *
 * 替代 StarterKit 内置的 CodeBlock（需在 StarterKit 中设 codeBlock: false）。
 */
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { CodeBlockView } from "../toolbar/CodeBlockView";

const lowlight = createLowlight(common);

export const CodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  HTMLAttributes: { class: "rich-editor-code-block" },
  // 未指定语言时回退到 plaintext（lowlight common 内置），避免 highlightAuto 自动探测着色。
  // language 为空会触发 highlightAuto，使「Plain Text」代码块仍被高亮，与需求不符。
  defaultLanguage: "plaintext",
});
