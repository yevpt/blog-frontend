"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useSession } from "@/app/providers/session-provider";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { addToast } from "@/lib/toast";
import { ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { ResponsiveModalShell } from "@/components/modal-shell/responsive-modal";
import { SnippetTextInput } from "./snippet-text-input";
import { SnippetImageUploader } from "./snippet-image-uploader";
import type { SnippetImageItem } from "./types";

const MAX_CONTENT = 800;

export function SnippetModal() {
  const { isOpen, editingSnippet, submitEdit, close, markPublished } = useSnippetModal();
  const { userId } = useSession();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<SnippetImageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isEditing = editingSnippet !== null;
  const overLimit = content.length > MAX_CONTENT;
  const canSubmit = content.trim().length > 0 && !overLimit && !submitting;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setContent(editingSnippet?.content ?? "");
    setImages(
      editingSnippet?.images.map((image) => ({
        id: `remote-${image.id}`,
        remoteUrl: image.access_url || image.url,
        previewUrl: image.access_url || image.url,
      })) ?? [],
    );
  }, [editingSnippet, isOpen]);

  function reset() {
    setImages((prev) => {
      prev.forEach((it) => {
        if (it.file) URL.revokeObjectURL(it.previewUrl);
      });
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
      if (isEditing) {
        if (!submitEdit) {
          throw new ApiClientError("编辑失败", 0);
        }
        await submitEdit(content, images);
        reset();
        close();
        return;
      }

      const form = new FormData();
      form.append("content", content);
      form.append("status", "1");
      form.append("comment_status", "1");
      images.forEach((it, i) => {
        if (!it.file) return;
        form.append("images", it.file, it.file.name);
        form.append("image_order", `file:${i}`);
      });
      const res = await fetch("/api/moments", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ApiClientError(data.error ?? "发布失败", res.status);
      }
      addToast("发布成功", "success");
      markPublished(userId);
      reset();
      close();
    } catch (err) {
      if (!isEditing) {
        addToast(getApiErrorMessage(err, "发布失败"), "error");
      } else if (!submitEdit) {
        addToast(getApiErrorMessage(err, "编辑失败"), "error");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModalShell
      isOpen={isOpen}
      title={isEditing ? "编辑碎语" : "写碎语"}
      onClose={handleClose}
      desktopMaxWidthClassName="max-w-[480px]"
      footer={
        <div className="flex items-center justify-end px-[18px] py-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/85 disabled:opacity-40"
          >
            {submitting ? (isEditing ? "保存中…" : "发布中…") : isEditing ? "保存" : "发布"}
          </button>
        </div>
      }
    >
      {({ onContentResize }) => (
        <ModalBody
          content={content}
          images={images}
          submitting={submitting}
          isEditing={isEditing}
          onContentResize={onContentResize}
          onChangeContent={setContent}
          onChangeImages={setImages}
        />
      )}
    </ResponsiveModalShell>
  );
}

interface ModalBodyProps {
  content: string;
  images: SnippetImageItem[];
  submitting: boolean;
  isEditing: boolean;
  onContentResize: () => void;
  onChangeContent: (value: string) => void;
  onChangeImages: Dispatch<SetStateAction<SnippetImageItem[]>>;
}

/**
 * 弹窗主体。内容或图片数量变化时通知外壳重测桌面高度，
 * 使弹窗随内容增高（修复：长文本/加图后区域被挤出需滚动）。
 */
function ModalBody({
  content,
  images,
  submitting,
  isEditing,
  onContentResize,
  onChangeContent,
  onChangeImages,
}: ModalBodyProps) {
  useEffect(() => {
    onContentResize();
  }, [content, images.length, onContentResize]);

  return (
    <div className="flex flex-col">
      {/* 编辑器撑满宽度 → 其底边框成为全宽分隔线；文字由内部 px-[18px] 内缩 */}
      <SnippetTextInput
        value={content}
        onChange={onChangeContent}
        placeholder={isEditing ? "修改这条碎语" : "此刻有什么想法？"}
        disabled={submitting}
        maxLength={MAX_CONTENT}
        onReady={() => requestAnimationFrame(onContentResize)}
      />
      <div className="px-[18px] py-3">
        <SnippetImageUploader items={images} onChange={onChangeImages} disabled={submitting} />
      </div>
    </div>
  );
}
