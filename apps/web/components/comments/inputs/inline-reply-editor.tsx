"use client";

import { useCallback, useState, type ReactNode } from "react";
import { RichCommentInput } from "./rich-comment-input";

export interface InlineReplyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  header?: ReactNode;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onSubmit: (content: string) => Promise<boolean>;
  className?: string;
}

/**
 * 内联回复/编辑输入框：封装「提交中状态 + RichCommentInput」，内容完全受控
 * （由调用方从 store 读写 value，这样组件卸载后草稿仍留在 store 里，重新挂载时能原样恢复）。
 * 本组件不负责收起自己——调用方决定「是否展开」，提交成功后调用方会把它从渲染树里移除。
 */
export function InlineReplyEditor({
  value,
  onChange,
  placeholder,
  header,
  isLoggedIn,
  onLoginRequired,
  onSubmit,
  className,
}: InlineReplyEditorProps) {
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
        onChange={onChange}
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
