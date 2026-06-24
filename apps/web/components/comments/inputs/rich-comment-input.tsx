"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { TempUploadResp } from "@repo/api";
import { LinkDialog, RichEditor, type ImageInsertHandlers, type MentionItem } from "@repo/editor";
import { useEditorImageUpload } from "@repo/hooks";
import { apiForm } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";

/** 剩余字数少于该阈值时显示计数器，提前提示用户接近上限（与 pill-comment-input 一致） */
const COMMENT_COUNTER_THRESHOLD = 100;

interface RichCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  mentionSuggestions?: MentionItem[];
  placeholder?: string;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  header?: ReactNode;
  focusTrigger?: unknown;
  className?: string;
  /**
   * 内容字符上限，镜像后端 dto 的 binding:"max=..."，提交前即提示避免无谓往返。
   * 传入后接近上限时在编辑器工具栏内显示 `当前长度/上限` 计数器。
   */
  maxLength?: number;
}

/**
 * 评论场景的富文本输入组件。
 * 组合 RichEditor + 选图上传占位插图；代码块由工具栏直接插入。
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
  header,
  focusTrigger,
  className,
  maxLength,
}: RichCommentInputProps) {
  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const imageUpload = useEditorImageUpload({
    scene: "comment",
    upload: async (file) => {
      const formData = new FormData();
      formData.append("dir", "images");
      formData.append("scene", "comment");
      formData.append("file", file);
      const resp = await apiForm<TempUploadResp>("/api/uploads/temp", formData, { method: "POST" });
      return resp.url || resp.key;
    },
    onError: (message) => addToast(message, "error"),
  });

  const handleInsertImage = useCallback(
    (handlers: ImageInsertHandlers) => {
      if (!isLoggedIn) {
        onLoginRequired?.();
        return;
      }
      imageUpload.handleInsertImageRequest(handlers);
    },
    [imageUpload, isLoggedIn, onLoginRequired],
  );

  const handleInsertLink = useCallback((insert: (url: string, title?: string) => void) => {
    setLinkDialog({ open: true, insert });
  }, []);

  const isOverLimit = maxLength != null && value.length > maxLength;

  const handleSubmit = useCallback(() => {
    if (isOverLimit) return;
    onSubmit();
  }, [isOverLimit, onSubmit]);

  return (
    <>
      <RichEditor
        value={value}
        onChange={onChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitDisabled={isOverLimit}
        isLoggedIn={isLoggedIn}
        onLoginRequired={onLoginRequired}
        placeholder={placeholder}
        mentionSuggestions={mentionSuggestions}
        onInsertImage={handleInsertImage}
        onInsertLink={handleInsertLink}
        header={header}
        focusTrigger={focusTrigger}
        className={className}
        maxLength={maxLength}
        characterCountThreshold={COMMENT_COUNTER_THRESHOLD}
      />

      <input
        ref={imageUpload.inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => void imageUpload.handleFileChange(event)}
      />

      <LinkDialog
        open={linkDialog.open}
        onClose={() => setLinkDialog({ open: false })}
        onConfirm={(url, title) => {
          linkDialog.insert?.(url, title);
          setLinkDialog({ open: false });
        }}
      />
    </>
  );
}
