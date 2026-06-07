"use client";

import { useState, useEffect } from "react";

interface LinkDialogProps {
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

  if (!open) return null;

  function handleConfirm() {
    if (!url.trim()) return;
    onConfirm(url.trim(), title.trim() || undefined);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="插入链接"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-[min(90vw,400px)] rounded-2xl bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入链接</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="link-dialog-url"
              className="mb-1 block text-xs font-medium text-(--fg2)"
            >
              链接 URL <span className="text-red-500">*</span>
            </label>
            <input
              id="link-dialog-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="链接文字（显示名称）"
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
