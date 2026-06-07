/**
 * ================================================================
 * RichEditor — Tiptap v3 WYSIWYG 富文本编辑器
 * ================================================================
 *
 * 【组件职责】
 * 将 Tiptap 编辑器实例（来自 useRichEditor hook）渲染为可交互的 UI。
 * 不处理任何业务逻辑——内容存储、插入行为均通过 props 注入。
 *
 * 【布局结构】
 * ┌─────────────────────────────────────────────────┐
 * │ 编辑区（EditorContent）                          │
 * │ - min-h: 104px，max-h: 240px，超出内部滚动       │
 * │ - prose 样式：标题/粗体/下划线在此即时渲染        │
 * │                                                 │
 * │ 工具栏（Toolbar）                                │
 * │ [B][I][U][─][🔗][🖼][</>][@]          [提交]   │
 * └─────────────────────────────────────────────────┘
 *
 * 【响应式】
 * - 编辑区：全宽，高度自动增长至 max-h-60（240px）
 * - 工具栏：sm 以下按钮区横向可滚动（见 Toolbar.tsx 注释）
 * - 整体容器：由父组件决定宽度（不设定 max-w）
 *
 * 【Tiptap EditorContent 说明】
 * EditorContent 渲染一个 contenteditable div，Tiptap 内部管理 DOM 更新。
 * React 不控制其子节点（ProseMirror 接管），因此样式通过 CSS 类名注入，
 * 而非 JSX children。
 *
 * 【placeholder 实现】
 * Placeholder 扩展将 data-placeholder 写到空段落上，
 * CSS ::before 伪元素读取该属性并渲染占位文字。
 * ================================================================
 */
"use client";

import { EditorContent } from "@tiptap/react";
import { clsx } from "clsx";
import { useRichEditor } from "./hooks/use-rich-editor";
import { Toolbar } from "./toolbar/Toolbar";
import type { RichEditorProps } from "./types";

export function RichEditor({
  value,
  onChange,
  placeholder = "写下你的内容...",
  disabled = false,
  mentionSuggestions = [],
  onSubmit,
  isSubmitting,
  onInsertImage,
  onInsertLink,
  onInsertCode,
  className,
}: RichEditorProps) {
  const editor = useRichEditor({
    initialValue: value,
    onChange,
    mentionSuggestions,
    placeholder,
    disabled,
  });

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-[14px] bg-[#f3f3f3] px-4 py-4 sm:px-5 sm:py-5",
        disabled && "opacity-60",
        className,
      )}
    >
      {/*
       * 编辑区
       * [&_.tiptap] 是 Tailwind 任意变体，精准选中 Tiptap 渲染的 .tiptap 元素。
       * prose：启用 @tailwindcss/typography 排版样式，使标题/粗体/代码在编辑中即时渲染。
       * 响应式说明：
       *   - min-h-[104px]：确保空状态下编辑区有足够点击区域
       *   - max-h-60 overflow-y-auto：超长内容在编辑区内滚动，不撑开页面
       *   - sm:max-h-80：平板及以上允许更高的编辑区
       */}
      <div
        data-rich-editor-area
        className={clsx(
          "min-h-[104px]",
          "[&_.tiptap]:block [&_.tiptap]:min-h-[104px] [&_.tiptap]:max-h-60 [&_.tiptap]:overflow-y-auto",
          "[&_.tiptap]:px-0 [&_.tiptap]:py-0 [&_.tiptap]:text-[15px] [&_.tiptap]:leading-6",
          "[&_.tiptap]:text-[#444444]",
          "[&_.tiptap]:outline-none",
          "[&_.tiptap]:prose [&_.tiptap]:prose-sm [&_.tiptap]:max-w-none",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-[#555555] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
          "[&_.rich-editor-mention]:text-primary [&_.rich-editor-mention]:font-medium",
          "sm:[&_.tiptap]:max-h-80",
        )}
      >
        {!editor && <p className="text-[15px] leading-6 text-[#555555]">{placeholder}</p>}
        <EditorContent editor={editor} data-placeholder={placeholder} />
      </div>

      <Toolbar
        editor={editor}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        onInsertImage={onInsertImage}
        onInsertLink={onInsertLink}
        onInsertCode={onInsertCode}
      />
    </div>
  );
}
