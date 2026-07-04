import { useRef, useState, type ChangeEvent } from "react";
import { readImageAspectRatio, type ImageInsertHandlers } from "@repo/editor";
import type { TempImageUploadScene } from "@repo/api";
import { prepareImageForUpload } from "./compress-image";
import { logUploadFileSize, formatUploadFileSize } from "./log-upload-file-size";

function createUploadId(): string {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }
  return `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getImageUploadErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return "图片上传失败，请重试";
}

export interface UseEditorImageUploadOptions {
  scene: TempImageUploadScene;
  /** 上传已准备好的文件，返回可插入编辑器的 URL */
  upload: (file: File) => Promise<string>;
  onError?: (message: string) => void;
}

/**
 * 富文本编辑器插图上传：选图后立即占位，上传完成后替换。
 * comment 场景超过 2MB 会客户端压缩；article 场景仅校验 10MB 体积上限。
 */
export function useEditorImageUpload({ scene, upload, onError }: UseEditorImageUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handlersRef = useRef<ImageInsertHandlers | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleInsertImageRequest = (handlers: ImageInsertHandlers) => {
    handlersRef.current = handlers;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const handlers = handlersRef.current;
    if (!handlers) return;

    setIsUploading(true);
    try {
      // 先插入全部相邻占位，文章编辑器才能在上传开始前把它们自动归为同一 gallery。
      const pending: Array<{ file: File; uploadId: string }> = [];
      for (const file of files) {
        const uploadId = createUploadId();
        let aspectRatio = 16 / 9;
        try {
          aspectRatio = await readImageAspectRatio(file);
        } catch {
          aspectRatio = 16 / 9;
        }
        handlers.insertLoading({ uploadId, aspectRatio, alt: file.name });
        pending.push({ file, uploadId });
      }

      for (const { file, uploadId } of pending) {
        try {
          logUploadFileSize(`${scene}:select`, file);
          const prepared = await prepareImageForUpload(
            file,
            scene === "comment" ? "comment" : "article",
          );
          logUploadFileSize(`${scene}:upload`, prepared, {
            originalBytes: file.size,
            originalLabel: formatUploadFileSize(file.size),
            ...(await readUploadDimensions(prepared)),
          });
          const url = await upload(prepared);
          handlers.resolveLoading(uploadId, url, prepared.name);
        } catch (err) {
          // 单文件失败只回收自己的占位，不影响批次内其他文件。
          handlers.removeLoading(uploadId);
          onError?.(getImageUploadErrorMessage(err));
        }
      }
    } finally {
      setIsUploading(false);
      handlersRef.current = null;
    }
  };

  return {
    inputRef,
    isUploading,
    handleInsertImageRequest,
    handleFileChange,
  };
}

async function readUploadDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (typeof createImageBitmap === "undefined") {
    return {};
  }
  try {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  } catch {
    return {};
  }
}
