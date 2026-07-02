"use client";

import { useCallback, useState, type ReactNode } from "react";
import { RichCommentInput } from "./rich-comment-input";

interface InlineReplyEditorProps {
  initialValue?: string;
  placeholder: string;
  header?: ReactNode;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onSubmit: (content: string) => Promise<boolean>;
  className?: string;
}

/**
 * 内联回复/编辑输入框：封装「本地内容 state + 提交中状态 + RichCommentInput」，
 * 由调用方决定「是否展开」（本组件不负责收起自己——提交成功后调用方会把它从渲染树里移除）。
 */
export function InlineReplyEditor({
  initialValue = "",
  placeholder,
  header,
  isLoggedIn,
  onLoginRequired,
  onSubmit,
  className,
}: InlineReplyEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    void onSubmit(trimmed).finally(() => setIsSaving(false));
  }, [value, isSaving, onSubmit]);

  return (
    <div className={className}>
      <RichCommentInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        isSubmitting={isSaving}
        isLoggedIn={isLoggedIn}
        onLoginRequired={onLoginRequired}
        placeholder={placeholder}
        maxLength={2000}
        header={header}
      />
    </div>
  );
}
