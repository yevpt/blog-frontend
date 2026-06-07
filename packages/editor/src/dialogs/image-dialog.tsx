"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "@repo/ui";

export interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string, alt?: string) => void;
}

export function ImageDialog({ open, onClose, onConfirm }: ImageDialogProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    if (!open) {
      setUrl("");
      setAlt("");
    }
  }, [open]);

  function handleConfirm() {
    if (!url.trim()) return;
    onConfirm(url.trim(), alt.trim() || undefined);
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      isDismissable
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      aria-label="插入图片"
      size="md"
      modalClassName="w-[min(90vw,400px)]"
      dialogClassName="p-5"
    >
      <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入图片</h3>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="image-dialog-url" className="mb-1 block text-xs font-medium text-(--fg2)">
            图片 URL <span className="text-red-500">*</span>
          </label>
          <input
            id="image-dialog-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/image.png"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="image-dialog-alt" className="mb-1 block text-xs font-medium text-(--fg2)">
            图片描述（可选）
          </label>
          <input
            id="image-dialog-alt"
            type="text"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="图片描述（alt 文本）"
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
