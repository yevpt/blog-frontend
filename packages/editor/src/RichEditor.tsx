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
 * │ - min-h: 88px，max-h: 240px，超出内部滚动        │
 * │ - prose 样式：标题/粗体/下划线在此即时渲染        │
 * │                                                 │
 * │ 工具栏（Toolbar）                                │
 * │ [B][I][U][─][🔗][🖼][</>][@]          [提交]   │
 * └─────────────────────────────────────────────────┘
 *
 * 【暗黑模式】
 * 容器背景/文字/占位符均使用 Tailwind 语义色令牌（bg-card、text-foreground 等），
 * 自动跟随系统/页面的明暗切换，无需额外代码。
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

import { useEffect } from "react";
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
  submitDisabled,
  maxLength,
  characterCountThreshold,
  showToolbarCharacterCount = true,
  isLoggedIn,
  onLoginRequired,
  onInsertImage,
  onInsertLink,
  onInsertCode,
  className,
  onReady,
  header,
  focusTrigger,
}: RichEditorProps) {
  const editor = useRichEditor({
    initialValue: value,
    onChange,
    mentionSuggestions,
    placeholder,
    disabled,
    maxLength,
  });

  useEffect(() => {
    if (focusTrigger != null) {
      editor?.commands.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTrigger]);

  // 编辑器实例从骨架屏切换到真实编辑器后高度会发生变化，
  // 通知父组件（如碎语弹窗）重新测量布局。
  useEffect(() => {
    if (editor) {
      onReady?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // 当外部将 value 重置为空字符串（如提交成功后），同步清空编辑器内容。
  // useRichEditor 的 content 只在首次创建时读取，之后不自动跟随 value 变化，
  // 因此需要在此显式调用 clearContent。
  useEffect(() => {
    if (value === "" && editor && !editor.isEmpty) {
      editor.commands.clearContent(true);
    }
  }, [value, editor]);

  const shell = clsx(
    "overflow-hidden rounded-xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-3.5",
    disabled && "opacity-60",
    className,
  );
  const currentLength = value.length;
  const isOverLimit = maxLength != null && currentLength > maxLength;
  const showCharacterCount =
    showToolbarCharacterCount &&
    maxLength != null &&
    (characterCountThreshold == null || currentLength >= maxLength - characterCountThreshold);
  const characterCountLabel = showCharacterCount ? `${currentLength}/${maxLength}` : undefined;

  // Tiptap 就绪前显示骨架屏，高度与真实编辑器完全一致，防止布局跳动
  if (!editor) {
    const bone = "animate-pulse rounded-md bg-foreground/[0.08]";
    return (
      <div className={shell} aria-hidden>
        <div className="min-h-[88px]">
          <div className={clsx(bone, "mt-[3px] h-[14px] w-2/5")} />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex flex-1 items-center gap-0.5">
            <div className={clsx(bone, "h-7 w-7")} />
            <div className={clsx(bone, "h-7 w-7")} />
            <div className={clsx(bone, "h-7 w-7")} />
            <div className="mx-1 h-4 w-px shrink-0 bg-border" />
            <div className={clsx(bone, "h-7 w-7")} />
            <div className={clsx(bone, "h-7 w-7")} />
            <div className={clsx(bone, "h-7 w-7")} />
            <div className={clsx(bone, "h-7 w-7")} />
          </div>
          <div className={clsx(bone, "h-8 w-14 rounded-full")} />
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/*
       * 编辑区（min-h 固定 88px）
       * header 存在时：header(24px) + tiptap(64px) = 88px，外部高度不变。
       */}
      <div
        data-rich-editor-area
        className={clsx(
          "min-h-[88px] w-full",
          "[&_.tiptap]:block [&_.tiptap]:w-full",
          header ? "[&_.tiptap]:min-h-[64px]" : "[&_.tiptap]:min-h-[88px]",
          "[&_.tiptap]:max-h-56 [&_.tiptap]:overflow-y-auto [&_.tiptap]:overflow-x-hidden",
          "[&_.tiptap]:px-0 [&_.tiptap]:py-0 [&_.tiptap]:text-[14px] [&_.tiptap]:leading-[1.6]",
          "[&_.tiptap]:text-foreground",
          "[&_.tiptap]:outline-none",
          "[&_.tiptap]:break-words",
          "[&_.tiptap]:prose [&_.tiptap]:prose-sm [&_.tiptap]:!max-w-none",
          "[&_.tiptap_p]:my-[0.2em]",
          // 占位符用 absolute 叠在段落上，避免 float-left 在换行后挤占行宽导致第二行右侧留白
          "[&_.tiptap_p.is-editor-empty:first-child]:relative",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:absolute",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:left-0",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:top-0",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.rich-editor-mention]:text-primary [&_.rich-editor-mention]:font-medium",
          // 图片为块级原子节点，方向键导航到图片时 ProseMirror 会产生 NodeSelection（节点选中态，
          // 而非文本插入光标），默认没有任何视觉样式会显得「光标消失」，这里补上选中态高亮。
          // 注意：outline-offset 必须用负值（向内绘制），因为外层 shell 容器有 overflow-hidden，
          // 正向 offset 会让描边超出图片自身盒模型，被祖先裁切（曾导致某一侧描边缺失）。
          "[&_.tiptap_img.ProseMirror-selectednode]:outline [&_.tiptap_img.ProseMirror-selectednode]:outline-2 [&_.tiptap_img.ProseMirror-selectednode]:outline-primary [&_.tiptap_img.ProseMirror-selectednode]:-outline-offset-2",
          "sm:[&_.tiptap]:max-h-72",
        )}
      >
        {header && <div className="flex h-6 items-center">{header}</div>}
        <EditorContent editor={editor} data-placeholder={placeholder} className="w-full" />
      </div>

      <Toolbar
        editor={editor}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        submitDisabled={submitDisabled}
        characterCountLabel={characterCountLabel}
        characterCountOverLimit={isOverLimit}
        isLoggedIn={isLoggedIn}
        onLoginRequired={onLoginRequired}
        onInsertImage={onInsertImage}
        onInsertLink={onInsertLink}
        onInsertCode={onInsertCode}
      />
    </div>
  );
}
