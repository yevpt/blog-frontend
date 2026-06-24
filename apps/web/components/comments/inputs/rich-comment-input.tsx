"use client";

import { useState, useCallback, type ReactNode } from "react";
import { ImageDialog, LinkDialog, RichEditor } from "@repo/editor";
import type { MentionItem } from "@repo/editor";

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
 * 组合 RichEditor + 图片/链接插入对话框；代码块由工具栏直接插入。
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
  const [imageDialog, setImageDialog] = useState<{
    open: boolean;
    insert?: (url: string, alt?: string) => void;
  }>({ open: false });

  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const handleInsertImage = useCallback((insert: (url: string, alt?: string) => void) => {
    setImageDialog({ open: true, insert });
  }, []);

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
    </>
  );
}
