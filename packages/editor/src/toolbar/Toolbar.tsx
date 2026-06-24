/**
 * Toolbar — 底部工具栏
 *
 * 【布局】
 * [ B ][ I ][ U ][ ─ ][ 🔗 ][ 🖼 ][ </> ]   →→→   [ 提交 ]
 * 左侧格式按钮区（横向可滚动）            固定右侧发送按钮
 *
 * 【响应式策略】
 * - sm 以下（手机）：左侧按钮区 overflow-x-auto，允许横向滚动，
 *   scrollbar-none 隐藏滚动条，发送按钮始终在右侧不参与滚动
 * - sm 及以上（平板/桌面）：工具栏单行展示，不需要滚动
 *
 * 【提交按钮状态】
 * - 未登录（isLoggedIn === false）：显示「请先登录」，点击调用 onLoginRequired
 * - 已登录 + 编辑器为空：禁用「提交」按钮
 * - 已登录 + 有内容：可点击「提交」
 * - 提交中（isSubmitting）：禁用「提交」按钮
 *
 * 【暗黑模式】
 * 所有颜色使用 Tailwind 语义色令牌，分隔线用 bg-border，
 * 提交按钮用 bg-primary / text-primary-foreground 跟随主题。
 */
import type { Editor, JSONContent } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { clsx } from "clsx";
import { ToolbarButton } from "./ToolbarButton";
import type { InsertHandlers } from "../types";

interface ToolbarProps extends InsertHandlers {
  editor: Editor | null;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  /** 业务层额外的提交禁用条件（如内容超出字数上限） */
  submitDisabled?: boolean;
  characterCountLabel?: string;
  characterCountOverLimit?: boolean;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  className?: string;
  trailing?: React.ReactNode;
  markAsEditorToolbar?: boolean;
}

function insertLink(editor: Editor | null, url: string, title?: string) {
  if (!editor) return;

  const linkText = title?.trim();
  const chain = editor.chain().focus();

  if (linkText) {
    chain
      .insertContent({
        type: "text",
        text: linkText,
        marks: [{ type: "link", attrs: { href: url } }],
      })
      .run();
    return;
  }

  if (editor.state.selection.empty) {
    chain
      .insertContent({
        type: "text",
        text: url,
        marks: [{ type: "link", attrs: { href: url } }],
      })
      .run();
    return;
  }

  chain.setLink({ href: url }).run();
}

function makeTextNode(text: string): JSONContent[] | undefined {
  return text ? [{ type: "text", text }] : undefined;
}

function currentTextBlockIsEmpty(editor: Editor) {
  const { selection } = editor.state;
  return (
    selection.empty &&
    selection.$from.parent.isTextblock &&
    selection.$from.parent.content.size === 0
  );
}

function insertCodeBlock(editor: Editor | null, code: string, lang: string) {
  if (!editor) return;

  const { $from } = editor.state.selection;
  const codeBlock: JSONContent = {
    type: "codeBlock",
    attrs: { language: lang },
    content: makeTextNode(code),
  };
  const content: JSONContent[] = [codeBlock, { type: "paragraph" }];

  if (editor.isEmpty) {
    editor
      .chain()
      .focus()
      .insertContentAt({ from: 0, to: editor.state.doc.content.size }, content)
      .run();
    return;
  }

  if (currentTextBlockIsEmpty(editor)) {
    editor
      .chain()
      .focus()
      .insertContentAt({ from: $from.before(), to: $from.after() }, content)
      .run();
    return;
  }

  editor.chain().focus().insertContentAt($from.after(), content).run();
}

export function Toolbar({
  editor,
  onSubmit,
  isSubmitting,
  submitDisabled: submitDisabledProp,
  characterCountLabel,
  characterCountOverLimit,
  isLoggedIn,
  onLoginRequired,
  onInsertImage,
  onInsertLink,
  onInsertCode,
  className,
  trailing,
  markAsEditorToolbar = false,
}: ToolbarProps) {
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            isEmpty: editor.isEmpty,
          }
        : {
            bold: false,
            italic: false,
            underline: false,
            isEmpty: true,
          },
  });

  const disabled = !editor || !editor.isEditable;
  const isEmpty = editorState?.isEmpty ?? true;

  /* 未登录且提供了 onLoginRequired 时，提交区域切换为登录引导按钮 */
  const needLogin = isLoggedIn === false && typeof onLoginRequired === "function";

  /* 已登录时，编辑器为空、正在提交、或业务层禁用（如超出字数上限）时禁用按钮 */
  const submitDisabled =
    isSubmitting === true || disabled || isEmpty || submitDisabledProp === true;

  return (
    <div
      {...(markAsEditorToolbar ? { "data-rich-editor-toolbar": true } : {})}
      className={clsx("flex items-center gap-1.5", className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none sm:overflow-x-visible">
        <ToolbarButton
          title="粗体（Ctrl+B）"
          label="B"
          labelClassName="font-bold"
          active={editorState?.bold ?? false}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="斜体（Ctrl+I）"
          label="I"
          labelClassName="italic"
          active={editorState?.italic ?? false}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="下划线（Ctrl+U）"
          label="U"
          labelClassName="underline underline-offset-1"
          active={editorState?.underline ?? false}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />

        <div className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        {onInsertLink && (
          <ToolbarButton
            title="插入链接"
            icon="link"
            disabled={disabled}
            onClick={() => {
              onInsertLink((url, title) => {
                insertLink(editor, url, title);
              });
            }}
          />
        )}

        {onInsertImage && (
          <ToolbarButton
            title="插入图片"
            icon="image"
            disabled={disabled}
            onClick={() => {
              onInsertImage((url, alt) => {
                editor
                  ?.chain()
                  .focus()
                  .setImage({ src: url, alt: alt ?? "" })
                  .run();
              });
            }}
          />
        )}

        {onInsertCode && (
          <ToolbarButton
            title="插入代码块"
            icon="code-block"
            disabled={disabled}
            onClick={() => {
              onInsertCode((code, lang) => {
                insertCodeBlock(editor, code, lang);
              });
            }}
          />
        )}
      </div>

      {trailing}

      {characterCountLabel && (
        <span
          className={clsx(
            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] leading-5 tabular-nums",
            characterCountOverLimit
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-border bg-foreground/[0.04] text-muted-foreground",
          )}
        >
          {characterCountLabel}
        </span>
      )}

      {onSubmit &&
        (needLogin ? (
          /* 未登录：点击打开登录弹窗 */
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onLoginRequired?.();
            }}
            aria-label="请先登录后评论"
            className="flex h-8 shrink-0 items-center justify-center rounded-full border border-input px-4 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            请先登录
          </button>
        ) : (
          /* 已登录：正常提交按钮，内容为空时禁用 */
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            disabled={submitDisabled}
            aria-label="发送评论"
            className={clsx(
              "flex h-8 shrink-0 items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-colors",
              submitDisabled
                ? "cursor-not-allowed bg-primary/50 text-primary-foreground opacity-70"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            提交
          </button>
        ))}
    </div>
  );
}
