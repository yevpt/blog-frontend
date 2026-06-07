/**
 * ================================================================
 * useRichEditor — Tiptap 编辑器实例创建 Hook
 * ================================================================
 *
 * 【职责】
 * 集中管理所有 Tiptap 扩展的配置，作为 RichEditor 组件的数据层。
 * RichEditor 只负责渲染，本 hook 负责"编辑器能做什么"。
 *
 * 【扩展清单（按功能分组）】
 *
 * ① StarterKit（套件，包含大多数基础格式）
 *    - Bold, Italic, Strike, Code, CodeBlock, Link, Heading (H1-H6)
 *    - BulletList, OrderedList, Paragraph, Document, HardBreak
 *    - 注意：underline: false，由 UnderlineExtension 单独引入（可追溯）
 *
 * ② UnderlineExtension（显式引入，见 extensions/underline.ts）
 *
 * ③ Markdown（@tiptap/markdown）
 *    - 双向 Markdown ↔ Tiptap JSON 转换
 *
 * ④ Image（@tiptap/extension-image）
 *    - inline: true：图片可嵌入段落（适合评论）
 *    - allowBase64: false：安全考虑，不允许 base64 图片
 *
 * ⑤ Mention（@tiptap/extension-mention，见 extensions/mention.ts）
 *    - 候选数据由外部传入；当前为空数组（等待后端 API）
 *
 * 【SSR 注意】
 * immediatelyRender: false 是 Next.js 环境的必要配置。
 * ProseMirror 需要真实 DOM 才能初始化，在服务端渲染阶段不存在 DOM，
 * 此选项告诉 Tiptap 延迟到客户端 hydration 后再创建编辑器实例，
 * 避免 React hydration 报错（服务端 HTML 与客户端渲染不匹配）。
 * ================================================================
 */
import { useMemo } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Image from "@tiptap/extension-image";
import { UnderlineExtension } from "../extensions/underline";
import { createMentionExtension } from "../extensions/mention";
import type { MentionItem } from "../types";

interface UseRichEditorOptions {
  initialValue: string;
  onChange: (markdown: string) => void;
  mentionSuggestions: MentionItem[];
  placeholder?: string;
  disabled?: boolean;
}

export function useRichEditor({
  initialValue,
  onChange,
  mentionSuggestions,
  disabled = false,
}: UseRichEditorOptions) {
  // 序列化为字符串作为稳定的 dep key，避免每次渲染传入新数组引用导致无限循环
  const mentionsJson = JSON.stringify(mentionSuggestions);
  // useMemo 依赖序列化字符串而非数组引用，仅在候选项内容实际变化时才重新计算
  const mentionKey = useMemo(() => mentionsJson, [mentionsJson]);

  return useEditor(
    {
      // ── SSR 适配 ─────────────────────────────────────────────
      // Next.js 在服务端渲染时无 DOM，必须设为 false 避免 hydration 错误
      immediatelyRender: false,

      // ── 扩展列表 ──────────────────────────────────────────────
      extensions: [
        // ① StarterKit：基础格式套件
        StarterKit.configure({
          // 下划线由 UnderlineExtension 单独引入（保持可追溯），禁用内置版本
          underline: false,

          // 链接：不在点击时打开（编辑器内保留编辑能力），新标签页打开
          link: {
            openOnClick: false,
            HTMLAttributes: {
              rel: "noopener noreferrer",
              target: "_blank",
            },
          },

          // 代码块：添加样式类供 CSS 定制
          codeBlock: {
            HTMLAttributes: { class: "rich-editor-code-block" },
          },

          // 评论场景不需要以下扩展（减少包体积）
          blockquote: false,
          horizontalRule: false,
        }),

        // ② 下划线（显式引入，见 extensions/underline.ts 追溯说明）
        UnderlineExtension,

        // ③ Markdown 序列化
        // @tiptap/markdown v3 不支持 html/tightLists 等选项，使用默认配置即可
        Markdown.configure({}),

        // ④ 图片（内联，仅 URL，不允许 base64）
        Image.configure({
          inline: true,
          allowBase64: false,
          HTMLAttributes: {
            class: "rich-editor-image",
            style: "max-width: 100%; height: auto; border-radius: 4px;",
          },
        }),

        // ⑤ @提及（候选列表由外部传入）
        // TODO(mention-api): 后端 /users/search 就绪后，在调用方填充 mentionSuggestions
        createMentionExtension(mentionSuggestions),
      ],

      // ── 初始内容 ──────────────────────────────────────────────
      // Markdown 扩展自动将字符串解析为 Tiptap 内部 JSON 格式
      // 注意：content 仅在 editor 首次创建时读取，后续通过 onUpdate 回调同步
      content: initialValue,

      editable: !disabled,

      // ── 内容变更回调 ──────────────────────────────────────────
      onUpdate: ({ editor }) => {
        onChange(editor.getMarkdown());
      },
    },
    // deps 数组：mentionKey 是序列化后的字符串，仅在候选列表实际变化时才重建 editor
    // 直接用 mentionSuggestions 数组引用会导致每次渲染创建新引用 → 无限循环
    [mentionKey],
  );
}
