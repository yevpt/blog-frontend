/**
 * Toolbar — 底部工具栏
 *
 * 【布局】
 * [ B ][ I ][ U ][ ─ ][ 🔗 ][ 🖼 ][ </> ][ @ ]   →→→   [ 发送 ↑ ]
 * 左侧格式按钮区（横向可滚动）            固定右侧发送按钮
 *
 * 【响应式策略】
 * - sm 以下（手机）：左侧按钮区 overflow-x-auto，允许横向滚动，
 *   scrollbar-none 隐藏滚动条，发送按钮始终在右侧不参与滚动
 * - sm 及以上（平板/桌面）：工具栏单行展示，不需要滚动
 */
import type { Editor } from "@tiptap/core";
import { SvgIcon } from "@repo/icons";
import { clsx } from "clsx";
import { ToolbarButton } from "./ToolbarButton";
import type { InsertHandlers } from "../types";

interface ToolbarProps extends InsertHandlers {
  editor: Editor | null;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function Toolbar({
  editor,
  onSubmit,
  isSubmitting,
  onInsertImage,
  onInsertLink,
  onInsertCode,
}: ToolbarProps) {
  if (!editor) return null;

  const disabled = !editor.isEditable;

  return (
    <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none sm:overflow-x-visible">
        <ToolbarButton
          title="粗体（Ctrl+B）"
          label="B"
          labelClassName="font-bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="斜体（Ctrl+I）"
          label="I"
          labelClassName="italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="下划线（Ctrl+U）"
          label="U"
          labelClassName="underline underline-offset-1"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <div className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        {onInsertLink && (
          <ToolbarButton
            title="插入链接"
            icon="link"
            disabled={disabled}
            onClick={() => {
              onInsertLink((url, title) => {
                if (title) {
                  editor.chain().focus().insertContent(`[${title}](${url})`).run();
                } else {
                  editor.chain().focus().setLink({ href: url }).run();
                }
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
                  .chain()
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
                editor.chain().focus().setCodeBlock({ language: lang }).insertContent(code).run();
              });
            }}
          />
        )}

        <ToolbarButton
          title="@提及用户"
          icon="at"
          disabled={disabled}
          onClick={() => {
            editor.chain().focus().insertContent("@").run();
          }}
        />
      </div>

      {onSubmit && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          disabled={isSubmitting || disabled}
          aria-label="发送评论"
          className={clsx(
            "ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
            isSubmitting || disabled
              ? "cursor-not-allowed opacity-40 bg-primary/50"
              : "bg-primary text-white hover:bg-primary/85",
          )}
        >
          <SvgIcon name="arrow-up" size={14} />
        </button>
      )}
    </div>
  );
}
