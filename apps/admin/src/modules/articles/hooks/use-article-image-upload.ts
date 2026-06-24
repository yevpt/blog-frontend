import { useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

export function useArticleImageUpload() {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const contentImageInsertRef = useRef<((url: string, alt?: string) => void) | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isContentImageUploading, setIsContentImageUploading] = useState(false);

  const uploadTempImage = async (file: File, dir: "images" | "covers"): Promise<string> => {
    const resp = await apiClient.uploads.tempImage(file, dir);
    return resp.url || resp.key;
  };

  const handleCoverFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsCoverUploading(true);
    try {
      const url = await uploadTempImage(file, "covers");
      onUploaded(url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "封面上传失败，请重试";
      addToast(message, "error");
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleInsertImageRequest = (insert: (url: string, alt?: string) => void) => {
    contentImageInsertRef.current = insert;
    contentImageInputRef.current?.click();
  };

  const handleContentImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const insert = contentImageInsertRef.current;
    if (!insert) return;

    setIsContentImageUploading(true);
    try {
      const url = await uploadTempImage(file, "images");
      insert(url, file.name);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "图片上传失败，请重试";
      addToast(message, "error");
    } finally {
      setIsContentImageUploading(false);
      contentImageInsertRef.current = null;
    }
  };

  return {
    coverInputRef,
    contentImageInputRef,
    isCoverUploading,
    isContentImageUploading,
    handleCoverFileChange,
    handleInsertImageRequest,
    handleContentImageFileChange,
  };
}
