"use client";

import { useState, useCallback } from "react";
import { LinkDialog, RichEditor } from "@repo/editor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  /** 编辑器实例首次就绪（从骨架屏切换到真实编辑器）时触发 */
  onReady?: () => void;
}

/** 碎语富文本输入：RichEditor + 链接对话框；不含图片按钮（图片走下方插入区），不含工具栏提交。 */
export function MomentTextInput({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  onReady,
}: Props) {
  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const handleInsertLink = useCallback(
    (insert: (url: string, title?: string) => void) => setLinkDialog({ open: true, insert }),
    [],
  );

  return (
    <>
      <RichEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onReady={onReady}
        onInsertLink={handleInsertLink}
        className="border-x-0! border-t-0! rounded-none! bg-transparent! px-[18px]!"
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
