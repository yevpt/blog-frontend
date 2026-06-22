"use client";

import { useRef, useState } from "react";
import { Button } from "@repo/ui";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { addToast } from "@/lib/toast";
import { ResponsiveModalShell } from "@/components/modal-shell/responsive-modal";
import { SnippetTextInput } from "./snippet-text-input";
import { SnippetImageUploader, type SnippetImageItem } from "./snippet-image-uploader";

const MAX_CONTENT = 800;

export function SnippetModal() {
  const { isOpen, close } = useSnippetModal();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<SnippetImageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const overLimit = content.length > MAX_CONTENT;
  const canSubmit = content.trim().length > 0 && !overLimit && !submitting;

  function reset() {
    setImages((prev) => {
      prev.forEach((it) => URL.revokeObjectURL(it.previewUrl));
      return [];
    });
    setContent("");
    submittingRef.current = false;
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    close();
  }

  async function handleSubmit() {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("content", content);
      form.append("status", "1");
      form.append("comment_status", "1");
      images.forEach((it, i) => {
        form.append("images", it.file, it.file.name);
        form.append("image_order", `file:${i}`);
      });
      const res = await fetch("/api/moments", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "发布失败");
      }
      addToast("发布成功", "success");
      reset();
      close();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "发布失败", "error");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModalShell
      isOpen={isOpen}
      title="写碎语"
      onClose={handleClose}
      desktopMaxWidthClassName="max-w-[480px]"
      footer={
        <div className="flex items-center justify-between px-[18px] py-3">
          <span aria-live="polite" className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
            {content.length}/{MAX_CONTENT}
          </span>
          <Button type="button" isDisabled={!canSubmit} onPress={handleSubmit}>
            {submitting ? "发布中…" : "发布"}
          </Button>
        </div>
      }
    >
      {() => (
        <div className="flex flex-col gap-1 px-[18px] py-3">
          <SnippetTextInput
            value={content}
            onChange={setContent}
            placeholder="此刻有什么想法？"
            disabled={submitting}
          />
          <SnippetImageUploader items={images} onChange={setImages} disabled={submitting} />
        </div>
      )}
    </ResponsiveModalShell>
  );
}
