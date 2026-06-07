"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "@repo/ui";

export interface LinkDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string, title?: string) => void;
}

export function LinkDialog({ open, onClose, onConfirm }: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) {
      setUrl("");
      setTitle("");
    }
  }, [open]);

  function handleConfirm() {
    if (!url.trim()) return;
    onConfirm(url.trim(), title.trim() || undefined);
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      isDismissable
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      aria-label="插入链接"
      size="md"
      modalClassName="w-[min(90vw,400px)]"
      dialogClassName="p-5"
    >
      <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入链接</h3>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="link-dialog-url" className="mb-1 block text-xs font-medium text-(--fg2)">
            链接 URL <span className="text-red-500">*</span>
          </label>
          <input
            id="link-dialog-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
          />
        </div>

        <div>
          <label
            htmlFor="link-dialog-title"
            className="mb-1 block text-xs font-medium text-(--fg2)"
          >
            链接文字（可选）
          </label>
          <input
            id="link-dialog-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="链接文字（显示名称）"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onPress={onClose}>
          取消
        </Button>
        <Button type="button" size="sm" isDisabled={!url.trim()} onPress={handleConfirm}>
          插入
        </Button>
      </div>
    </Modal>
  );
}
