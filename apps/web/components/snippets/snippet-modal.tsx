"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { SvgIcon } from "@repo/icons";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { addToast } from "@/lib/toast";
import { ResponsiveModalShell } from "@/components/modal-shell/responsive-modal";
import { SnippetTextInput } from "./snippet-text-input";
import {
  SnippetImageUploader,
  type SnippetImageItem,
  type SnippetImageUploaderHandle,
} from "./snippet-image-uploader";

const MAX_CONTENT = 800;
const MAX_IMAGES = 9;

export function SnippetModal() {
  const { isOpen, close } = useSnippetModal();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<SnippetImageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const uploaderRef = useRef<SnippetImageUploaderHandle>(null);

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
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              aria-label="添加图片"
              onClick={() => uploaderRef.current?.openPicker()}
              disabled={submitting || images.length >= MAX_IMAGES}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <SvgIcon name="image" size={18} />
              <span>
                {images.length}/{MAX_IMAGES}
              </span>
            </button>
            <span
              aria-live="polite"
              className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}
            >
              {content.length}/{MAX_CONTENT}
            </span>
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/85 disabled:opacity-40"
          >
            {submitting ? "发布中…" : "发布"}
          </button>
        </div>
      }
    >
      {({ onContentResize }) => (
        <ModalBody
          content={content}
          images={images}
          submitting={submitting}
          uploaderRef={uploaderRef}
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
  uploaderRef: RefObject<SnippetImageUploaderHandle | null>;
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
  uploaderRef,
  onContentResize,
  onChangeContent,
  onChangeImages,
}: ModalBodyProps) {
  useEffect(() => {
    onContentResize();
  }, [content, images.length, onContentResize]);

  return (
    <div className="flex flex-col gap-2 px-[18px] py-3">
      <SnippetTextInput
        value={content}
        onChange={onChangeContent}
        placeholder="此刻有什么想法？"
        disabled={submitting}
      />
      <SnippetImageUploader
        ref={uploaderRef}
        items={images}
        onChange={onChangeImages}
        disabled={submitting}
      />
    </div>
  );
}
