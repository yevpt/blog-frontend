import { useRef, useState, type ChangeEvent } from "react";
import { readImageAspectRatio, type ImageInsertHandlers } from "@repo/editor";
import type { TempImageUploadScene } from "@repo/api";
import { compressImage } from "./compress-image";

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
 * comment 场景会先客户端压缩；article 场景直传。
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
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const handlers = handlersRef.current;
    if (!handlers) return;

    const uploadId = createUploadId();
    let aspectRatio = 16 / 9;

    try {
      aspectRatio = await readImageAspectRatio(file);
    } catch {
      aspectRatio = 16 / 9;
    }

    handlers.insertLoading({ uploadId, aspectRatio, alt: file.name });
    setIsUploading(true);

    try {
      const prepared = scene === "comment" ? await compressImage(file) : file;
      const url = await upload(prepared);
      handlers.resolveLoading(uploadId, url, prepared.name);
    } catch (err) {
      handlers.removeLoading(uploadId);
      onError?.(getImageUploadErrorMessage(err));
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
