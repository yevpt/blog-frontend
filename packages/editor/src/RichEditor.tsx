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
import { EDITOR_BLOCKQUOTE_QUOTELESS_CLASSES } from "./utils/prose-blockquote-classes";
import { normalizeMarkdownEols } from "./utils/normalize-markdown-eols";
import { useRichEditor } from "./hooks/use-rich-editor";
import { Toolbar } from "./toolbar/Toolbar";
import type { RichEditorProps } from "./types";

/** plain 画布水平留白：标题/正文/页脚共用 */
const PLAIN_SURFACE_INSET_X = "px-5 sm:px-10";
/** 工具栏左缘略收，抵消方形按钮内图标/字形居中带来的视觉右移 */
const PLAIN_TOOLBAR_INSET_X = "pl-3 pr-5 sm:pl-8 sm:pr-10";
const PLAIN_ARTICLE_RHYTHM_CLASSES = [
  "[&_.tiptap_p]:leading-[1.85]",
  "[&_.tiptap_h1]:mt-[1.25em] [&_.tiptap_h1]:mb-[0.65em]",
  "[&_.tiptap_h2]:mt-[1.35em] [&_.tiptap_h2]:mb-[0.65em]",
  "[&_.tiptap_h3]:mt-[1.25em] [&_.tiptap_h3]:mb-[0.55em]",
  "[&_.rich-editor-code-wrapper]:!my-8",
  "[&_.rich-editor-code-wrapper:first-child]:!mt-0",
  "[&_.rich-editor-code-wrapper:last-child]:!mb-0",
].join(" ");

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
  className,
  onReady,
  header,
  focusTrigger,
  variant = "card",
  toolbarPlacement = "bottom",
  toolbarTrailing,
  enableBlockquote = false,
}: RichEditorProps) {
  const editor = useRichEditor({
    initialValue: value,
    onChange,
    mentionSuggestions,
    placeholder,
    disabled,
    maxLength,
    enableBlockquote,
  });

  useEffect(() => {
    if (focusTrigger != null) {
      // 由父组件控制滚动定位，避免 focus 再次触发浏览器默认 scrollIntoView 顶到 fixed 导航下
      editor?.commands.focus("end", { scrollIntoView: false });
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

  // 外部 value 变化时同步到编辑器（如编辑页异步回填）；与编辑器当前内容一致则跳过，避免干扰输入。
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = editor.getMarkdown();
    if (normalizeMarkdownEols(value) === normalizeMarkdownEols(currentMarkdown)) return;

    if (value === "") {
      if (!editor.isEmpty) {
        editor.commands.clearContent(true);
      }
      return;
    }

    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [value, editor]);

  const isPlain = variant === "plain";
  const toolbarOnTop = toolbarPlacement === "top";

  const shell = clsx(
    isPlain
      ? "flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
      : "overflow-hidden rounded-xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-3.5",
    disabled && "opacity-60",
    className,
  );

  const editorAreaClassName = clsx(
    "w-full",
    isPlain
      ? [
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          "[&_.tiptap]:block [&_.tiptap]:w-full",
          header ? "[&_.tiptap]:min-h-[64px]" : "[&_.tiptap]:min-h-[320px]",
          "[&_.tiptap]:max-h-none [&_.tiptap]:overflow-visible",
          "[&_.tiptap]:px-0 [&_.tiptap]:py-0 [&_.tiptap]:text-base [&_.tiptap]:leading-[1.85]",
        ]
      : [
          "min-h-[88px]",
          "[&_.tiptap]:block [&_.tiptap]:w-full",
          header ? "[&_.tiptap]:min-h-[64px]" : "[&_.tiptap]:min-h-[88px]",
          "[&_.tiptap]:max-h-56 [&_.tiptap]:overflow-y-auto [&_.tiptap]:overflow-x-hidden",
          "[&_.tiptap]:px-0 [&_.tiptap]:py-0 [&_.tiptap]:text-[14px] [&_.tiptap]:leading-[1.6]",
          "sm:[&_.tiptap]:max-h-72",
        ],
    "[&_.tiptap]:text-foreground",
    "[&_.tiptap]:outline-none",
    "[&_.tiptap]:break-words",
    "[&_.tiptap]:tracking-[0.01em]",
    "[&_.tiptap]:prose [&_.tiptap]:prose-neutral [&_.tiptap]:dark:prose-invert [&_.tiptap]:!max-w-none",
    isPlain ? ["[&_.tiptap]:prose-base", PLAIN_ARTICLE_RHYTHM_CLASSES] : "[&_.tiptap]:prose-sm",
    !isPlain && "[&_.tiptap_p]:my-[0.2em]",
    isPlain && "[&_.tiptap_p]:text-foreground/90",
    "[&_.tiptap_p.is-editor-empty:first-child]:relative",
    "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
    "[&_.tiptap_p.is-editor-empty:first-child::before]:absolute",
    "[&_.tiptap_p.is-editor-empty:first-child::before]:left-0",
    "[&_.tiptap_p.is-editor-empty:first-child::before]:top-0",
    "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground",
    "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
    "[&_.rich-editor-mention]:text-primary [&_.rich-editor-mention]:font-medium",
    // 评论/碎语（card）与 MarkdownContent comment 一致；文章编辑（plain）走 prose 默认全宽。
    !isPlain && "[&_.tiptap_img]:max-w-[240px] [&_.tiptap_img]:h-auto [&_.tiptap_img]:rounded-md",
    !isPlain &&
      "[&_[data-rich-editor-image-loading]]:max-w-[240px] [&_[data-rich-editor-image]]:max-w-[240px] [&_[data-rich-editor-image]_img]:rounded-md",
    "[&_.tiptap_img.ProseMirror-selectednode]:outline [&_.tiptap_img.ProseMirror-selectednode]:outline-2 [&_.tiptap_img.ProseMirror-selectednode]:outline-primary [&_.tiptap_img.ProseMirror-selectednode]:-outline-offset-2",
    enableBlockquote && EDITOR_BLOCKQUOTE_QUOTELESS_CLASSES,
  );

  const currentLength = value.length;
  const isOverLimit = maxLength != null && currentLength > maxLength;
  const showCharacterCount =
    showToolbarCharacterCount &&
    maxLength != null &&
    (characterCountThreshold == null || currentLength >= maxLength - characterCountThreshold);
  const characterCountLabel = showCharacterCount ? `${currentLength}/${maxLength}` : undefined;

  const toolbarNode = (
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
      markAsEditorToolbar={isPlain && toolbarOnTop}
      showBlockquote={enableBlockquote}
      trailing={toolbarTrailing}
      className={clsx(
        isPlain && toolbarOnTop && clsx("shrink-0 py-2.5", PLAIN_TOOLBAR_INSET_X),
        !isPlain && "mt-1.5",
        isPlain &&
          toolbarOnTop &&
          "[&_button]:size-[30px] [&_button]:rounded-md [&_button:hover]:bg-muted [&_button[aria-pressed=true]]:bg-muted",
      )}
    />
  );

  const editorAreaNode = (
    <div data-rich-editor-area className={editorAreaClassName}>
      {header && <div className="flex h-6 items-center">{header}</div>}
      {isPlain ? (
        <div className={clsx("w-full pb-10 pt-2", PLAIN_SURFACE_INSET_X)}>
          <EditorContent editor={editor} data-placeholder={placeholder} className="w-full" />
        </div>
      ) : (
        <EditorContent editor={editor} data-placeholder={placeholder} className="w-full" />
      )}
    </div>
  );

  // Tiptap 就绪前显示骨架屏，高度与真实编辑器完全一致，防止布局跳动
  if (!editor) {
    const bone = "animate-pulse rounded-md bg-foreground/[0.08]";
    return (
      <div className={shell} aria-hidden>
        {isPlain && toolbarOnTop ? (
          <div className={clsx("flex shrink-0 gap-1 py-2.5", PLAIN_TOOLBAR_INSET_X)}>
            <div className={clsx(bone, "size-[30px]")} />
            <div className={clsx(bone, "size-[30px]")} />
            <div className={clsx(bone, "size-[30px]")} />
          </div>
        ) : null}
        <div className={isPlain ? "min-h-[320px] flex-1" : "min-h-[88px]"}>
          {!isPlain || !toolbarOnTop ? (
            <div className={clsx(bone, "mt-[3px] h-[14px] w-2/5")} />
          ) : null}
        </div>
        {!isPlain || !toolbarOnTop ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex flex-1 items-center gap-0.5">
              <div className={clsx(bone, "h-7 w-7")} />
              <div className={clsx(bone, "h-7 w-7")} />
              <div className={clsx(bone, "h-7 w-7")} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shell}>
      {toolbarOnTop ? toolbarNode : null}
      {editorAreaNode}
      {!toolbarOnTop ? toolbarNode : null}
    </div>
  );
}
