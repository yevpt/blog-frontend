"use client";

import { useState, useEffect } from "react";

interface ImageDialogProps {
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

  if (!open) return null;

  function handleConfirm() {
    if (!url.trim()) return;
    onConfirm(url.trim(), alt.trim() || undefined);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="插入图片"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-[min(90vw,400px)] rounded-2xl bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入图片</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="image-dialog-url"
              className="mb-1 block text-xs font-medium text-(--fg2)"
            >
              图片 URL <span className="text-red-500">*</span>
            </label>
            <input
              id="image-dialog-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="image-dialog-alt"
              className="mb-1 block text-xs font-medium text-(--fg2)"
            >
              图片描述（可选）
            </label>
            <input
              id="image-dialog-alt"
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="图片描述（alt 文本）"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!url.trim()}
            onClick={handleConfirm}
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
