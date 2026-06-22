"use client";

import { useState, useCallback } from "react";
import { CodeDialog, LinkDialog, RichEditor } from "@repo/editor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** 碎语富文本输入：RichEditor + 链接/代码对话框；不含图片按钮（图片走下方插入区），不含工具栏提交。 */
export function SnippetTextInput({ value, onChange, placeholder, disabled }: Props) {
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; insert?: (url: string, title?: string) => void }>({ open: false });
  const [codeDialog, setCodeDialog] = useState<{ open: boolean; insert?: (code: string, lang: string) => void }>({ open: false });

  const handleInsertLink = useCallback((insert: (url: string, title?: string) => void) => setLinkDialog({ open: true, insert }), []);
  const handleInsertCode = useCallback((insert: (code: string, lang: string) => void) => setCodeDialog({ open: true, insert }), []);

  return (
    <>
      <RichEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onInsertLink={handleInsertLink}
        onInsertCode={handleInsertCode}
        // 去掉默认的卡片盒子（四边框/圆角/背景/横向内边距），只保留底部分隔线
        className="border-x-0! border-t-0! rounded-none! bg-transparent! px-0!"
      />
      <LinkDialog
        open={linkDialog.open}
        onClose={() => setLinkDialog({ open: false })}
        onConfirm={(url, title) => { linkDialog.insert?.(url, title); setLinkDialog({ open: false }); }}
      />
      <CodeDialog
        open={codeDialog.open}
        onClose={() => setCodeDialog({ open: false })}
        onConfirm={(code, lang) => { codeDialog.insert?.(code, lang); setCodeDialog({ open: false }); }}
      />
    </>
  );
}
