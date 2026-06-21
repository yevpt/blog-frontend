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
 *    - inline: false：图片为块级节点，独占一行
 *      （曾用 inline: true，但图片远高于文本行高，导致 contenteditable
 *      光标命中测试错位，见下方 ⑤ 处注释）
 *    - allowBase64: false：安全考虑，不允许 base64 图片
 *
 * ⑤ PlaceholderExtension（本地扩展）
 *    - 为评论空态段落添加 data-placeholder 和 is-editor-empty class
 *
 * ⑥ Mention（@tiptap/extension-mention，见 extensions/mention.ts）
 *    - 候选数据由外部传入；当前为空数组（等待后端 API）
 *
 * 【SSR 注意】
 * immediatelyRender: false 是 Next.js 环境的必要配置。
 * ProseMirror 需要真实 DOM 才能初始化，在服务端渲染阶段不存在 DOM，
 * 此选项告诉 Tiptap 延迟到客户端 hydration 后再创建编辑器实例，
 * 避免 React hydration 报错（服务端 HTML 与客户端渲染不匹配）。
 * ================================================================
 */
import { useRef, useEffect } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Image from "@tiptap/extension-image";
import { UnderlineExtension } from "../extensions/underline";
import { createMentionExtension } from "../extensions/mention";
import { PlaceholderExtension } from "../extensions/placeholder";
import { CodeBlockExtension } from "../extensions/code-block";
import { AtomParagraphMergeExtension } from "../extensions/atom-paragraph-merge";
import { MarkBoundaryExtension } from "../extensions/mark-boundary";
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
  placeholder,
  disabled = false,
}: UseRichEditorOptions) {
  // 通过 ref 持有最新 onChange，避免 stale closure 问题
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // 序列化为字符串作为稳定的 dep key，避免每次渲染传入新数组引用导致无限循环
  const mentionsJson = JSON.stringify(mentionSuggestions);

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

          // 代码块由 CodeBlockExtension（lowlight 高亮版）单独引入，禁用内置版本
          codeBlock: false,

          // 评论场景不需要以下扩展（减少包体积）
          blockquote: false,
          horizontalRule: false,
        }),

        // ② 下划线（显式引入，见 extensions/underline.ts 追溯说明）
        UnderlineExtension,

        // ③ 代码块（lowlight 语法高亮 + React NodeView 语言标签）
        CodeBlockExtension,

        // ④ Markdown 序列化
        // @tiptap/markdown v3 不支持 html/tightLists 等选项，使用默认配置即可
        Markdown.configure({}),

        // ⑤ 图片（块级，仅 URL，不允许 base64）
        // 注意：曾用 inline: true 让图片嵌入段落，但图片渲染高度（240px）远超文本行高，
        // 导致 contenteditable 对内联原子节点的点击命中测试/光标渲染严重错位
        // （点击图片右侧光标不可见、按 Left 键移动后光标位置与实际插入位置不一致）。
        // 改为块级后，图片独占一行，由 StarterKit 内置的 Gapcursor 处理光标定位，问题消失。
        Image.configure({
          inline: false,
          allowBase64: false,
          HTMLAttributes: {
            class: "rich-editor-image",
            style: "max-width: 240px; height: auto; border-radius: 6px;",
          },
        }),

        // ⑥ 修复空段落与图片相邻时 Backspace/Delete 无法删除空段落的问题（见该扩展内注释）
        AtomParagraphMergeExtension,

        // ⑦ 修复链接/行内代码处于文档开头时，左边界继续输入仍继承格式的问题
        MarkBoundaryExtension,

        // ⑧ 占位文字：空编辑器时在首个空段落上生成 data-placeholder
        PlaceholderExtension.configure({
          placeholder: placeholder ?? "",
        }),

        // ⑨ @提及（候选列表由外部传入）
        // TODO(mention-api): 后端 /users/search 就绪后，在调用方填充 mentionSuggestions
        createMentionExtension(mentionSuggestions),
      ],

      // ── 初始内容 ──────────────────────────────────────────────
      // Markdown 扩展自动将字符串解析为 Tiptap 内部 JSON 格式
      // 注意：content 仅在 editor 首次创建时读取，后续通过 onUpdate 回调同步
      content: initialValue,

      editable: !disabled,

      // ── 内容变更回调 ──────────────────────────────────────────
      // 通过 ref 调用最新 onChange，避免 stale closure（父组件每次渲染传入新函数引用）
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getMarkdown());
      },
    },
    // deps 数组：mentionsJson 是序列化后的字符串，仅在候选列表实际变化时才重建 editor
    // 直接用 mentionSuggestions 数组引用会导致每次渲染创建新引用 → 无限循环
    [mentionsJson],
  );
}
