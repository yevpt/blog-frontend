"use client";

import { useState, useCallback } from "react";
import { RichEditor } from "@repo/editor";
import type { MentionItem } from "@repo/editor";
import { ImageDialog } from "./dialogs/image-dialog";
import { LinkDialog } from "./dialogs/link-dialog";
import { CodeDialog } from "./dialogs/code-dialog";

interface RichCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  mentionSuggestions?: MentionItem[];
  placeholder?: string;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
}

/**
 * 评论场景的富文本输入组件。
 * 组合 RichEditor + 三个插入对话框（图片/链接/代码块）。
 *
 * 插入流程：
 *   工具栏按钮点击 → RichEditor 调用 onInsertXxx handler
 *   → handler 打开对应对话框 → 用户填写 → 对话框 onConfirm 回调 insert()
 *   → insert() 将内容写入 Tiptap 编辑器
 */
export function RichCommentInput({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  mentionSuggestions = [],
  placeholder = "写下你的评论...",
  isLoggedIn,
  onLoginRequired,
}: RichCommentInputProps) {
  const [imageDialog, setImageDialog] = useState<{
    open: boolean;
    insert?: (url: string, alt?: string) => void;
  }>({ open: false });

  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const [codeDialog, setCodeDialog] = useState<{
    open: boolean;
    insert?: (code: string, lang: string) => void;
  }>({ open: false });

  const handleInsertImage = useCallback((insert: (url: string, alt?: string) => void) => {
    setImageDialog({ open: true, insert });
  }, []);

  const handleInsertLink = useCallback((insert: (url: string, title?: string) => void) => {
    setLinkDialog({ open: true, insert });
  }, []);

  const handleInsertCode = useCallback((insert: (code: string, lang: string) => void) => {
    setCodeDialog({ open: true, insert });
  }, []);

  return (
    <>
      <RichEditor
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={isLoggedIn}
        onLoginRequired={onLoginRequired}
        placeholder={placeholder}
        mentionSuggestions={mentionSuggestions}
        onInsertImage={handleInsertImage}
        onInsertLink={handleInsertLink}
        onInsertCode={handleInsertCode}
      />

      <ImageDialog
        open={imageDialog.open}
        onClose={() => setImageDialog({ open: false })}
        onConfirm={(url, alt) => {
          imageDialog.insert?.(url, alt);
          setImageDialog({ open: false });
        }}
      />

      <LinkDialog
        open={linkDialog.open}
        onClose={() => setLinkDialog({ open: false })}
        onConfirm={(url, title) => {
          linkDialog.insert?.(url, title);
          setLinkDialog({ open: false });
        }}
      />

      <CodeDialog
        open={codeDialog.open}
        onClose={() => setCodeDialog({ open: false })}
        onConfirm={(code, lang) => {
          codeDialog.insert?.(code, lang);
          setCodeDialog({ open: false });
        }}
      />
    </>
  );
}
