"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useSession } from "@/app/providers/session-provider";
import { useMomentModal } from "@/store/use-moment-modal";
import { addToast } from "@/lib/toast";
import { apiForm, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { ResponsiveModalShell } from "@/components/modal-shell/responsive-modal";
import type { MomentItemResp } from "@repo/api";
import { getAuthorMomentEditImages } from "@/components/moderation";
import { MomentTextInput } from "./moment-text-input";
import { MomentImageUploader } from "./moment-image-uploader";
import { momentPublishFingerprint } from "./moment-submit-fingerprint";
import { logMomentUploadImages } from "./log-moment-upload-images";
import type { MomentImageItem } from "./types";

const MAX_CONTENT = 800;

function toMomentImageItems(images: MomentItemResp["images"]) {
  return images.map((image) => ({
    id: `remote-${image.id}`,
    remoteUrl: image.access_url || image.url,
    previewUrl: image.access_url || image.url,
  }));
}

export function MomentModal() {
  const { isOpen, editingMoment, submitEdit, close, markPublished } = useMomentModal();
  const { userId } = useSession();
  // 发布碎语复用 moment 幂等键：同载荷重试保留，成功或明确 4xx 后 reset
  const { getIdempotencyKey, resetIdempotencyKey } = useIdempotencyKey("moment");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<MomentImageItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isEditing = editingMoment !== null;
  const overLimit = content.length > MAX_CONTENT;
  const canSubmit = content.trim().length > 0 && !overLimit && !submitting;
  // 中风险编辑：编辑器回显待审正文，并提示当前编辑内容仍在审核
  const hasPendingRevision = Boolean(isEditing && editingMoment?.moderation?.has_pending_revision);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // 优先回显待审正文，便于作者继续编辑未通过版本；无待审则回退到公开正文
    if (!editingMoment) {
      setContent("");
      setImages([]);
      return;
    }
    setContent(editingMoment.moderation?.pending_content ?? editingMoment.content ?? "");
    setImages(toMomentImageItems(getAuthorMomentEditImages(editingMoment)));
  }, [editingMoment, isOpen]);

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
      logMomentUploadImages("publish", images);
      const key = getIdempotencyKey(momentPublishFingerprint(content, "1", "1", images));
      const res = await apiForm<MomentItemResp>("/api/moments", form, {
        method: "POST",
        headers: { "Idempotency-Key": key },
      });
      resetIdempotencyKey();
      addToast(res.moderation?.notice ?? "发布成功", "success");
      markPublished(userId, res);
      reset();
      close();
    } catch (err) {
      if (!isEditing) {
        // 明确 4xx（含高风险拦截、401）后 reset；5xx 与网络错误保留同载荷键以便幂等重试
        if (err instanceof ApiClientError && err.status >= 400 && err.status < 500) {
          resetIdempotencyKey();
        }
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
        <>
          {hasPendingRevision && (
            <p className="px-[18px] pt-3 text-xs text-muted-foreground" role="status">
              编辑内容正在审核
            </p>
          )}
          <ModalBody
            content={content}
            images={images}
            submitting={submitting}
            isEditing={isEditing}
            onContentResize={onContentResize}
            onChangeContent={setContent}
            onChangeImages={setImages}
          />
        </>
      )}
    </ResponsiveModalShell>
  );
}

interface ModalBodyProps {
  content: string;
  images: MomentImageItem[];
  submitting: boolean;
  isEditing: boolean;
  onContentResize: () => void;
  onChangeContent: (value: string) => void;
  onChangeImages: Dispatch<SetStateAction<MomentImageItem[]>>;
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
      <MomentTextInput
        value={content}
        onChange={onChangeContent}
        placeholder={isEditing ? "修改这条碎语" : "此刻有什么想法？"}
        disabled={submitting}
        maxLength={MAX_CONTENT}
        onReady={() => requestAnimationFrame(onContentResize)}
      />
      <div className="px-[18px] py-3">
        <MomentImageUploader items={images} onChange={onChangeImages} disabled={submitting} />
      </div>
    </div>
  );
}
